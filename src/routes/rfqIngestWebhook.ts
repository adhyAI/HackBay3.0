import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import { TenantRequest } from "../db/tenantRouter";
import { selectScoped, insertScoped } from "../db/butterbaseClient";
import { calculateSafetyRiskScore } from "../neo4j/riskQuery";

interface RfqIngestPayload {
  client_name: string;
  client_email: string;
  rfq_id?: string;
  parts: { part_number: string; quantity: number }[];
}

interface InventoryRow {
  part_number: string;
  standard_cost: string;
}

export const rfqIngestWebhook = Router();

rfqIngestWebhook.post("/api/webhook/rfq-ingest", async (req: Request, res: Response) => {
  const payload = req.body as RfqIngestPayload;
  const tenantReq = req as TenantRequest;

  if (!payload?.client_name || !payload?.client_email || !Array.isArray(payload.parts) || payload.parts.length === 0) {
    res.status(400).json({ error: "Payload must include client_name, client_email, and a non-empty parts array" });
    return;
  }

  const tenantId = tenantReq.tenantId;
  const rfqId = payload.rfq_id ?? randomUUID();

  try {
    const partNumbers = payload.parts.map((p) => p.part_number);
    const inventory = await selectScoped<InventoryRow>("inventory_catalog", tenantId, {
      part_number: `in.(${partNumbers.join(",")})`,
    });

    const costByPart = new Map(inventory.map((row) => [row.part_number, Number(row.standard_cost)]));
    const totalQuote = payload.parts.reduce((sum, part) => {
      const unitCost = costByPart.get(part.part_number) ?? 0;
      return sum + unitCost * part.quantity;
    }, 0);

    const risk = await calculateSafetyRiskScore(tenantId, rfqId);

    const record = await insertScoped("rfq_records", tenantId, {
      client_name: payload.client_name,
      client_email: payload.client_email,
      total_quote: totalQuote,
      safety_risk_score: risk.safety_risk_score,
      status: "pending",
    });

    res.status(201).json({ record, risk });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});
