import { Router, Request, Response } from "express";
import { TenantRequest } from "../db/tenantRouter";
import { selectScoped } from "../db/butterbaseClient";

export const tenantDataRoutes = Router();

tenantDataRoutes.get("/api/inventory", async (req: Request, res: Response) => {
  const tenantId = (req as TenantRequest).tenantId;
  const rows = await selectScoped("inventory_catalog", tenantId, { order: "part_number.asc" });
  res.json(rows);
});

tenantDataRoutes.get("/api/rfqs", async (req: Request, res: Response) => {
  const tenantId = (req as TenantRequest).tenantId;
  const rows = await selectScoped("rfq_records", tenantId, { order: "created_at.desc" });
  res.json(rows);
});
