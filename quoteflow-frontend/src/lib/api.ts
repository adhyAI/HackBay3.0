const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ?? "https://api.butterbase.ai/v1/app_3hzl91g7eemj/fn";

export interface RfqCardDto {
  id: string;
  tenant_id: string;
  stage: string;
  customer_name: string;
  customer_email: string;
  email_subject: string | null;
  email_body: string | null;
  pdf_url: string | null;
  part_description: string | null;
  quantity: string | number | null;
  diagram_note: string | null;
  sales_notes: string | null;
  engineering_notes: string | null;
  daytona_output: {
    unitMaterialCost: number;
    wasteFactor: number;
    totalMaterialCost: number;
    laborHoursEstimate: number;
    computedAt: string;
    sandboxId?: string;
  } | null;
  similar_rfqs: {
    items: {
      customerName: string;
      partDescription: string;
      quantity: number;
      vendorName: string;
      vendorLandingCost: number;
      markupPercent: number;
      finalPrice: number;
      quotedAt: string;
    }[];
  } | null;
  vendor_name: string | null;
  vendor_landing_cost: string | number | null;
  markup_percent: string | number;
  final_quote: string | number | null;
  created_at: string;
  updated_at: string;
}

function withTenant(path: string, tenantId: string): string {
  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set("tenant_id", tenantId);
  return url.toString();
}

async function request<T>(path: string, tenantId: string, init?: RequestInit): Promise<T> {
  const res = await fetch(withTenant(path, tenantId), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function action(tenantId: string, action: string, id: string, extra?: Record<string, unknown>) {
  return request<RfqCardDto>("/pipeline-action", tenantId, {
    method: "POST",
    body: JSON.stringify({ action, id, ...extra }),
  });
}

export function fetchCards(tenantId: string) {
  return request<RfqCardDto[]>("/pipeline-cards", tenantId);
}

export function moveStage(tenantId: string, id: string, stage: string) {
  return action(tenantId, "move_stage", id, { stage });
}

export function runDaytonaSandbox(tenantId: string, id: string) {
  return action(tenantId, "daytona_run", id);
}

export function findSimilarRfqs(tenantId: string, id: string) {
  return action(tenantId, "similar_rfqs", id);
}

export function getVendorQuote(tenantId: string, id: string) {
  return action(tenantId, "vendor_quote", id);
}

export function finalizeQuote(tenantId: string, id: string) {
  return action(tenantId, "finalize", id);
}

export function parseRfq(tenantId: string, id: string) {
  return action(tenantId, "parse", id);
}

export interface NewRfqPayload {
  customer_name: string;
  customer_email: string;
  email_subject?: string;
  email_body: string;
  pdf_url?: string;
}

export function ingestNewRfq(tenantId: string, payload: NewRfqPayload) {
  return request<RfqCardDto>("/pipeline-ingest", tenantId, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
