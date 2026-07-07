import fetch from "node-fetch";

const API_URL = process.env.BUTTERBASE_API_URL ?? "";
const API_KEY = process.env.BUTTERBASE_API_KEY ?? "";

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${API_KEY}`,
  };
}

/**
 * Selects rows from `table`, always scoped by tenant_id.
 * PostgREST-style filters are merged in, so callers cannot accidentally omit the tenant filter.
 */
export async function selectScoped<T = Record<string, unknown>>(
  table: string,
  tenantId: string,
  extraFilters: Record<string, string> = {}
): Promise<T[]> {
  const params = new URLSearchParams({ tenant_id: `eq.${tenantId}`, ...extraFilters });
  const res = await fetch(`${API_URL}/${table}?${params.toString()}`, { headers: headers() });
  if (!res.ok) throw new Error(`Butterbase select failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as T[];
}

/**
 * Inserts a row into `table`, forcing tenant_id onto the payload so a row can
 * never be written under the wrong tenant.
 */
export async function insertScoped<T = Record<string, unknown>>(
  table: string,
  tenantId: string,
  data: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`${API_URL}/${table}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ ...data, tenant_id: tenantId }),
  });
  if (!res.ok) throw new Error(`Butterbase insert failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

/**
 * Fetches a single row by id, scoped to tenant_id. Returns undefined if the
 * row doesn't exist or belongs to a different tenant — callers should treat
 * that as a 404, never fall back to an unscoped lookup.
 */
export async function getByIdScoped<T = Record<string, unknown>>(
  table: string,
  tenantId: string,
  id: string
): Promise<T | undefined> {
  const rows = await selectScoped<T>(table, tenantId, { id: `eq.${id}` });
  return rows[0];
}

/**
 * Updates a row by id. Callers must first confirm the row belongs to the
 * tenant (e.g. via getByIdScoped) — this function does not re-check tenant_id
 * itself since PATCH targets a single row by primary key.
 */
export async function updateById<T = Record<string, unknown>>(
  table: string,
  id: string,
  data: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`${API_URL}/${table}/${id}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Butterbase update failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}
