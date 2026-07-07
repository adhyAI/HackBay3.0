import { NextFunction, Request, Response } from "express";

export interface TenantRequest extends Request {
  tenantId: string;
}

/**
 * Resolves tenant_id from the `x-tenant-id` header (preferred) or a
 * `tenant_id` query param, and rejects the request outright if neither is
 * present — there is no implicit default tenant that could leak data across
 * tenants.
 */
export function tenantRouter(req: Request, res: Response, next: NextFunction) {
  const tenantId =
    (req.header("x-tenant-id") ?? (req.query.tenant_id as string | undefined))?.trim();

  if (!tenantId) {
    res.status(400).json({ error: "Missing tenant_id (send x-tenant-id header or ?tenant_id=)" });
    return;
  }

  (req as TenantRequest).tenantId = tenantId;
  next();
}
