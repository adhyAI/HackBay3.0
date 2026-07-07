// Butterbase's Deno function sandbox blocks any npm package that reads OS info
// internally (missing --allow-sys), which rules out the official neo4j-driver
// and @daytona/sdk packages. Both are replaced here with direct HTTP calls to
// their underlying REST APIs (Neo4j's Query API v2, Daytona's REST + toolbox
// proxy), same technique already used for Nebius.

const STAGES = ["received", "sales_review", "engineering_review", "vendor_quote", "customer_sent"];
const VENDOR_NAMES = ["Pacific Rim Fabrication", "Titan Metal Supply", "Ironclad Machining"];
const MODEL = "meta-llama/Llama-3.3-70B-Instruct";

async function parseRfqEmail(env, emailSubject, emailBody) {
  const prompt = `Extract structured fields from this RFQ (request for quote) email. Respond with ONLY a JSON object, no other text, in the exact shape:
{"part_description": string, "quantity": number, "diagram_note": string}

part_description: the part/product being requested.
quantity: the number of units requested, as a plain integer.
diagram_note: any spec/dimension/material detail mentioned (tolerances, dimensions, materials, ratings). If none, use an empty string.

Email subject: ${emailSubject ?? "(none)"}
Email body:
${emailBody ?? "(none)"}`;

  const res = await fetch(`${env.NEBIUS_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.NEBIUS_API_KEY}` },
    body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: prompt }], temperature: 0 }),
  });
  if (!res.ok) throw new Error(`Nebius parse request failed: ${res.status} ${await res.text()}`);

  const data = await res.json();
  const content = data.choices[0].message.content;
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Nebius parse response had no JSON object: ${content}`);

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    part_description: String(parsed.part_description ?? "Unspecified part"),
    quantity: Number(parsed.quantity ?? 0),
    diagram_note: String(parsed.diagram_note ?? ""),
  };
}

async function runNumberCrunch(env, partDescription, quantity, diagramNote) {
  const apiUrl = env.DAYTONA_API_URL || "https://app.daytona.io/api";
  const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${env.DAYTONA_API_KEY}` };

  const createRes = await fetch(`${apiUrl}/sandbox`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ language: "typescript" }),
  });
  if (!createRes.ok) throw new Error(`Daytona create sandbox failed: ${createRes.status} ${await createRes.text()}`);
  const sandbox = await createRes.json();
  const sandboxId = sandbox.id;

  try {
    const code = `
      const quantity = ${quantity};
      const complexity = ${JSON.stringify(partDescription)}.length + ${JSON.stringify(diagramNote ?? "")}.length;
      const unitMaterialCost = Math.round((5 + complexity * 0.15) * 100) / 100;
      const wasteFactor = 0.08;
      const totalMaterialCost = Math.round(unitMaterialCost * quantity * (1 + wasteFactor) * 100) / 100;
      const laborHoursEstimate = Math.round((quantity / 40 + complexity * 0.02) * 100) / 100;
      console.log(JSON.stringify({ unitMaterialCost, wasteFactor, totalMaterialCost, laborHoursEstimate }));
    `;

    const runRes = await fetch(`https://proxy.app.daytona.io/toolbox/${sandboxId}/process/code-run`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ code, language: "typescript", timeout: 30 }),
    });
    if (!runRes.ok) throw new Error(`Daytona code-run failed: ${runRes.status} ${await runRes.text()}`);
    const runResult = await runRes.json();

    const output = String(runResult.result ?? "");
    const jsonLine = output
      .split("\n")
      .map((l) => l.trim())
      .reverse()
      .find((l) => l.startsWith("{") && l.endsWith("}"));
    if (!jsonLine) throw new Error(`Daytona sandbox produced no parseable JSON output: ${output}`);

    const parsed = JSON.parse(jsonLine);
    return { ...parsed, computedAt: new Date().toISOString(), sandboxId };
  } finally {
    await fetch(`${apiUrl}/sandbox/${sandboxId}`, { method: "DELETE", headers: authHeaders });
  }
}

async function similarHistoricalRfqs(env, partKeyword, quantity, limit = 5) {
  const httpUri = env.NEO4J_URI.replace(/^neo4j\+s:\/\//, "https://")
    .replace(/^neo4j:\/\//, "http://")
    .replace(/^bolt\+s:\/\//, "https://")
    .replace(/^bolt:\/\//, "http://");
  const basicAuth = btoa(`${env.NEO4J_USER}:${env.NEO4J_PASSWORD}`);

  const res = await fetch(`${httpUri}/db/neo4j/query/v2`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Basic ${basicAuth}`,
    },
    body: JSON.stringify({
      statement: `
        MATCH (cust:Customer)-[:SUBMITTED]->(h:HistoricalRFQ)-[:RESULTED_IN]->(q:Quote)
        WHERE toLower(h.part_description) CONTAINS toLower($partKeyword)
           OR toLower($partKeyword) CONTAINS toLower(h.part_description)
        WITH cust, h, q, abs(h.quantity - $quantity) AS quantityDiff
        RETURN cust.name AS customerName,
               h.part_description AS partDescription,
               h.quantity AS quantity,
               q.vendor_name AS vendorName,
               q.vendor_landing_cost AS vendorLandingCost,
               q.markup_percent AS markupPercent,
               q.final_price AS finalPrice,
               q.quoted_at AS quotedAt
        ORDER BY quantityDiff ASC
        LIMIT $limitVal
      `,
      parameters: { partKeyword, quantity, limitVal: limit },
    }),
  });
  if (!res.ok) throw new Error(`Neo4j query failed: ${res.status} ${await res.text()}`);

  const body = await res.json();
  const fields = body.data.fields;
  return body.data.values.map((row) => {
    const obj = {};
    fields.forEach((f, i) => (obj[f] = row[i]));
    return {
      customerName: obj.customerName,
      partDescription: obj.partDescription,
      quantity: obj.quantity,
      vendorName: obj.vendorName,
      vendorLandingCost: obj.vendorLandingCost,
      markupPercent: obj.markupPercent,
      finalPrice: obj.finalPrice,
      quotedAt: obj.quotedAt,
    };
  });
}

function simulateVendorQuote(daytonaOutput, quantity) {
  const baseCost = daytonaOutput?.totalMaterialCost ?? quantity * 10;
  const vendorLandingCost = Math.round(baseCost * (1 + (Math.random() * 0.15 - 0.05)) * 100) / 100;
  const vendorName = VENDOR_NAMES[Math.floor(Math.random() * VENDOR_NAMES.length)];
  return { vendor_name: vendorName, vendor_landing_cost: vendorLandingCost };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

export async function handler(req, ctx) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return jsonResponse({ error: "Missing x-tenant-id header" }, 400);

  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const { action, id, stage } = body ?? {};
  if (!id || !action) return jsonResponse({ error: "id and action are required" }, 400);

  const { rows } = await ctx.db.query("SELECT * FROM rfq_cards WHERE id = $1 AND tenant_id = $2", [id, tenantId]);
  const card = rows[0];
  if (!card) return jsonResponse({ error: "Card not found for this tenant" }, 404);

  try {
    if (action === "move_stage") {
      if (!STAGES.includes(stage)) return jsonResponse({ error: `stage must be one of: ${STAGES.join(", ")}` }, 400);
      if (stage === "customer_sent") {
        return jsonResponse(
          { error: "customer_sent is only reachable via the finalize action — it computes and locks in the final quote." },
          400
        );
      }

      let parsedFields = {};
      let daytonaOutput = card.daytona_output;
      let similarRfqs = card.similar_rfqs;
      let vendorPatch = {};

      if (stage === "sales_review") {
        if (!card.part_description) parsedFields = await parseRfqEmail(ctx.env, card.email_subject, card.email_body);
      } else if (stage === "engineering_review") {
        if (!card.part_description) parsedFields = await parseRfqEmail(ctx.env, card.email_subject, card.email_body);
        const partDesc = parsedFields.part_description ?? card.part_description;
        const qty = parsedFields.quantity ?? card.quantity;
        const note = parsedFields.diagram_note ?? card.diagram_note;
        if (!card.daytona_output) daytonaOutput = await runNumberCrunch(ctx.env, partDesc, Number(qty), note);
        if (!card.similar_rfqs) similarRfqs = { items: await similarHistoricalRfqs(ctx.env, partDesc, Number(qty)) };
      } else if (stage === "vendor_quote" && card.vendor_landing_cost == null) {
        vendorPatch = simulateVendorQuote(card.daytona_output, Number(card.quantity));
      }

      const newPartDescription = parsedFields.part_description ?? card.part_description;
      const newQuantity = parsedFields.quantity ?? card.quantity;
      const newDiagramNote = parsedFields.diagram_note ?? card.diagram_note;
      const newVendorName = vendorPatch.vendor_name ?? card.vendor_name;
      const newVendorLandingCost = vendorPatch.vendor_landing_cost ?? card.vendor_landing_cost;

      const { rows: updated } = await ctx.db.query(
        `UPDATE rfq_cards SET stage=$2, part_description=$3, quantity=$4, diagram_note=$5,
         daytona_output=$6::jsonb, similar_rfqs=$7::jsonb, vendor_name=$8, vendor_landing_cost=$9, updated_at=now()
         WHERE id=$1 RETURNING *`,
        [
          id,
          stage,
          newPartDescription,
          newQuantity,
          newDiagramNote,
          daytonaOutput ? JSON.stringify(daytonaOutput) : null,
          similarRfqs ? JSON.stringify(similarRfqs) : null,
          newVendorName,
          newVendorLandingCost,
        ]
      );
      return jsonResponse(updated[0]);
    }

    if (action === "parse") {
      const parsed = await parseRfqEmail(ctx.env, card.email_subject, card.email_body);
      const { rows: updated } = await ctx.db.query(
        `UPDATE rfq_cards SET part_description=$2, quantity=$3, diagram_note=$4, updated_at=now() WHERE id=$1 RETURNING *`,
        [id, parsed.part_description, parsed.quantity, parsed.diagram_note]
      );
      return jsonResponse(updated[0]);
    }

    if (action === "daytona_run") {
      if (!card.part_description) return jsonResponse({ error: "Card hasn't been parsed yet — run the parse action first" }, 400);
      const daytonaOutput = await runNumberCrunch(ctx.env, card.part_description, Number(card.quantity), card.diagram_note);
      const { rows: updated } = await ctx.db.query(
        `UPDATE rfq_cards SET daytona_output=$2::jsonb, updated_at=now() WHERE id=$1 RETURNING *`,
        [id, JSON.stringify(daytonaOutput)]
      );
      return jsonResponse(updated[0]);
    }

    if (action === "similar_rfqs") {
      if (!card.part_description) return jsonResponse({ error: "Card hasn't been parsed yet — run the parse action first" }, 400);
      const similarRfqs = await similarHistoricalRfqs(ctx.env, card.part_description, Number(card.quantity));
      const { rows: updated } = await ctx.db.query(
        `UPDATE rfq_cards SET similar_rfqs=$2::jsonb, updated_at=now() WHERE id=$1 RETURNING *`,
        [id, JSON.stringify({ items: similarRfqs })]
      );
      return jsonResponse(updated[0]);
    }

    if (action === "vendor_quote") {
      const patch = simulateVendorQuote(card.daytona_output, Number(card.quantity));
      const { rows: updated } = await ctx.db.query(
        `UPDATE rfq_cards SET vendor_name=$2, vendor_landing_cost=$3, updated_at=now() WHERE id=$1 RETURNING *`,
        [id, patch.vendor_name, patch.vendor_landing_cost]
      );
      return jsonResponse(updated[0]);
    }

    if (action === "finalize") {
      if (card.vendor_landing_cost == null) return jsonResponse({ error: "Card has no vendor_landing_cost yet — run the vendor_quote action first" }, 400);
      const finalQuote = Math.round(Number(card.vendor_landing_cost) * (1 + Number(card.markup_percent) / 100) * 100) / 100;
      const { rows: updated } = await ctx.db.query(
        `UPDATE rfq_cards SET final_quote=$2, stage='customer_sent', updated_at=now() WHERE id=$1 RETURNING *`,
        [id, finalQuote]
      );
      return jsonResponse(updated[0]);
    }

    return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    return jsonResponse({ error: String(err?.message ?? err) }, 502);
  }
}
