import { Router, Request, Response } from "express";
import { TenantRequest } from "../db/tenantRouter";
import { selectScoped, insertScoped, getByIdScoped, updateById } from "../db/butterbaseClient";
import { runNumberCrunch, NumberCrunchOutput } from "../daytona/daytonaClient";
import { similarHistoricalRfqs } from "../neo4j/historyQuery";
import { parseRfqEmail } from "../nebius/nebiusClient";
import { sendRfqToRocketRide } from "../rocketride/pipelineClient";

const STAGES = ["received", "sales_review", "engineering_review", "vendor_quote", "customer_sent"] as const;
type Stage = (typeof STAGES)[number];

interface RfqCard {
  id: string;
  tenant_id: string;
  stage: Stage;
  customer_name: string;
  customer_email: string;
  email_subject: string | null;
  email_body: string | null;
  part_description: string | null;
  quantity: string | null;
  diagram_note: string | null;
  vendor_landing_cost: string | null;
  markup_percent: string;
  daytona_output?: NumberCrunchOutput | null;
  similar_rfqs?: { items: unknown[] } | null;
}

export const pipelineRoutes = Router();

function tenantOf(req: Request): string {
  return (req as TenantRequest).tenantId;
}

const VENDOR_NAMES = ["Pacific Rim Fabrication", "Titan Metal Supply", "Ironclad Machining"];

/** Shared by the dedicated /vendor-quote endpoint and the auto-orchestration on stage move. */
function simulateVendorQuote(card: RfqCard) {
  const baseCost = card.daytona_output?.totalMaterialCost ?? Number(card.quantity) * 10;
  const vendorLandingCost = Math.round(baseCost * (1 + (Math.random() * 0.15 - 0.05)) * 100) / 100;
  const vendorName = VENDOR_NAMES[Math.floor(Math.random() * VENDOR_NAMES.length)];
  return { vendor_name: vendorName, vendor_landing_cost: vendorLandingCost };
}

/** Runs the Sales Review parse step (Nebius LLM extraction) if not already done. Returns the fields to patch, if any. */
async function ensureParsed(card: RfqCard): Promise<Record<string, unknown>> {
  if (card.part_description) return {};
  const parsed = await parseRfqEmail(card.email_subject, card.email_body);
  return {
    part_description: parsed.part_description,
    quantity: parsed.quantity,
    diagram_note: parsed.diagram_note,
  };
}

pipelineRoutes.get("/api/pipeline/cards", async (req: Request, res: Response) => {
  const rows = await selectScoped("rfq_cards", tenantOf(req), { order: "created_at.desc" });
  res.json(rows);
});

pipelineRoutes.post("/api/webhook/rocketride-ingest", async (req: Request, res: Response) => {
  const tenantId = tenantOf(req);
  const { customer_name, customer_email, email_subject, email_body, pdf_url } = req.body ?? {};

  if (!customer_name || !customer_email || !email_body) {
    res.status(400).json({ error: "customer_name, customer_email, and email_body are required" });
    return;
  }

  // Nothing is parsed yet — this is the raw inbound email. Structured fields
  // (part_description/quantity/diagram_note) are extracted later, when the
  // card moves to Sales Review.
  const card = await insertScoped("rfq_cards", tenantId, {
    stage: "received",
    customer_name,
    customer_email,
    email_subject,
    email_body,
    pdf_url,
  });

  // Hand off to the real RocketRide cloud pipeline (agent crunches numbers via Daytona,
  // checks history via Neo4j, writes results back via Butterbase). The card already
  // exists in Butterbase, so a RocketRide outage never blocks card creation.
  try {
    await sendRfqToRocketRide({ tenant_id: tenantId, customer_name, customer_email, email_subject, email_body });
  } catch (err) {
    console.warn("RocketRide hand-off failed:", (err as Error).message);
  }

  res.status(201).json(card);
});

pipelineRoutes.patch("/api/pipeline/cards/:id/stage", async (req: Request, res: Response) => {
  const tenantId = tenantOf(req);
  const { stage } = req.body ?? {};

  if (!STAGES.includes(stage)) {
    res.status(400).json({ error: `stage must be one of: ${STAGES.join(", ")}` });
    return;
  }

  const existing = await getByIdScoped<RfqCard>("rfq_cards", tenantId, req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Card not found for this tenant" });
    return;
  }

  if (stage === "customer_sent") {
    res.status(400).json({
      error: "customer_sent is only reachable via the Finalize action — it computes and locks in the final quote.",
    });
    return;
  }

  const patch: Record<string, unknown> = { stage, updated_at: new Date().toISOString() };

  try {
    // RocketRide auto-orchestration: entering a stage runs that stage's agent work,
    // idempotently (skipped if already computed), so the human only has to drag the card.
    if (stage === "sales_review") {
      Object.assign(patch, await ensureParsed(existing));
    } else if (stage === "engineering_review") {
      // Defensive: if a card was dragged straight here, parse first — Daytona/Neo4j need the parsed fields.
      const parsedPatch = await ensureParsed(existing);
      Object.assign(patch, parsedPatch);
      const cardForCrunch = { ...existing, ...parsedPatch } as RfqCard;

      if (!existing.daytona_output) {
        patch.daytona_output = await runNumberCrunch({
          partDescription: cardForCrunch.part_description!,
          quantity: Number(cardForCrunch.quantity),
          diagramNote: cardForCrunch.diagram_note,
        });
      }
      if (!existing.similar_rfqs) {
        const similarRfqs = await similarHistoricalRfqs(cardForCrunch.part_description!, Number(cardForCrunch.quantity));
        patch.similar_rfqs = { items: similarRfqs };
      }
    } else if (stage === "vendor_quote" && existing.vendor_landing_cost == null) {
      Object.assign(patch, simulateVendorQuote({ ...existing, ...patch } as RfqCard));
    }
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
    return;
  }

  const updated = await updateById("rfq_cards", req.params.id, patch);
  res.json(updated);
});

pipelineRoutes.post("/api/pipeline/cards/:id/parse", async (req: Request, res: Response) => {
  const tenantId = tenantOf(req);
  const card = await getByIdScoped<RfqCard>("rfq_cards", tenantId, req.params.id);
  if (!card) {
    res.status(404).json({ error: "Card not found for this tenant" });
    return;
  }

  try {
    const parsed = await parseRfqEmail(card.email_subject, card.email_body);
    const updated = await updateById("rfq_cards", req.params.id, {
      part_description: parsed.part_description,
      quantity: parsed.quantity,
      diagram_note: parsed.diagram_note,
      updated_at: new Date().toISOString(),
    });
    res.json(updated);
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

pipelineRoutes.post("/api/pipeline/cards/:id/daytona-run", async (req: Request, res: Response) => {
  const tenantId = tenantOf(req);
  const card = await getByIdScoped<RfqCard>("rfq_cards", tenantId, req.params.id);
  if (!card) {
    res.status(404).json({ error: "Card not found for this tenant" });
    return;
  }
  if (!card.part_description) {
    res.status(400).json({ error: "Card hasn't been parsed yet — run the parse step (Sales Review) first" });
    return;
  }

  try {
    const daytonaOutput = await runNumberCrunch({
      partDescription: card.part_description,
      quantity: Number(card.quantity),
      diagramNote: card.diagram_note,
    });

    const updated = await updateById("rfq_cards", req.params.id, {
      daytona_output: daytonaOutput,
      updated_at: new Date().toISOString(),
    });
    res.json(updated);
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

pipelineRoutes.post("/api/pipeline/cards/:id/similar-rfqs", async (req: Request, res: Response) => {
  const tenantId = tenantOf(req);
  const card = await getByIdScoped<RfqCard>("rfq_cards", tenantId, req.params.id);
  if (!card) {
    res.status(404).json({ error: "Card not found for this tenant" });
    return;
  }
  if (!card.part_description) {
    res.status(400).json({ error: "Card hasn't been parsed yet — run the parse step (Sales Review) first" });
    return;
  }

  try {
    const similarRfqs = await similarHistoricalRfqs(card.part_description, Number(card.quantity));
    // Butterbase's jsonb columns reject a top-level JSON array value; wrap it in an object.
    const updated = await updateById("rfq_cards", req.params.id, {
      similar_rfqs: { items: similarRfqs },
      updated_at: new Date().toISOString(),
    });
    res.json(updated);
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

pipelineRoutes.post("/api/pipeline/cards/:id/vendor-quote", async (req: Request, res: Response) => {
  const tenantId = tenantOf(req);
  const card = await getByIdScoped<RfqCard>("rfq_cards", tenantId, req.params.id);
  if (!card) {
    res.status(404).json({ error: "Card not found for this tenant" });
    return;
  }

  const updated = await updateById("rfq_cards", req.params.id, {
    ...simulateVendorQuote(card),
    updated_at: new Date().toISOString(),
  });
  res.json(updated);
});

pipelineRoutes.post("/api/pipeline/cards/:id/finalize", async (req: Request, res: Response) => {
  const tenantId = tenantOf(req);
  const card = await getByIdScoped<RfqCard>("rfq_cards", tenantId, req.params.id);
  if (!card) {
    res.status(404).json({ error: "Card not found for this tenant" });
    return;
  }

  if (card.vendor_landing_cost == null) {
    res.status(400).json({ error: "Card has no vendor_landing_cost yet — run the vendor-quote step first" });
    return;
  }

  const finalQuote =
    Math.round(Number(card.vendor_landing_cost) * (1 + Number(card.markup_percent) / 100) * 100) / 100;

  const updated = await updateById("rfq_cards", req.params.id, {
    final_quote: finalQuote,
    stage: "customer_sent",
    updated_at: new Date().toISOString(),
  });
  res.json(updated);
});
