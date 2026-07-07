import "dotenv/config";
import fetch from "node-fetch";

const API_URL = process.env.BUTTERBASE_API_URL ?? "";
const API_KEY = process.env.BUTTERBASE_API_KEY ?? "";

function headers() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` };
}

async function findTenant(companyName: string): Promise<{ id: string } | undefined> {
  const res = await fetch(`${API_URL}/tenants?company_name=eq.${encodeURIComponent(companyName)}`, {
    headers: headers(),
  });
  const rows = (await res.json()) as { id: string }[];
  return rows[0];
}

async function upsertTenant(companyName: string): Promise<string> {
  const existing = await findTenant(companyName);
  if (existing) return existing.id;

  const res = await fetch(`${API_URL}/tenants`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ company_name: companyName }),
  });
  const row = (await res.json()) as { id: string };
  return row.id;
}

async function insertPart(tenantId: string, part: { part_number: string; name: string; standard_cost: number }) {
  await fetch(`${API_URL}/inventory_catalog`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ tenant_id: tenantId, ...part }),
  });
}

async function main() {
  const alphaId = await upsertTenant("Alpha Tech");
  const betaId = await upsertTenant("Beta Aero");

  const alphaParts = [
    { part_number: "AT-1001", name: "Precision Bearing Assembly", standard_cost: 42.5 },
    { part_number: "AT-1002", name: "Aluminum Heat Sink", standard_cost: 18.75 },
    { part_number: "AT-1003", name: "Circuit Board Connector", standard_cost: 6.2 },
  ];
  const betaParts = [
    { part_number: "BA-2001", name: "Titanium Turbine Blade", standard_cost: 310 },
    { part_number: "BA-2002", name: "Hydraulic Actuator", standard_cost: 158.4 },
    { part_number: "BA-2003", name: "Avionics Wiring Harness", standard_cost: 89.99 },
  ];

  for (const part of alphaParts) await insertPart(alphaId, part);
  for (const part of betaParts) await insertPart(betaId, part);

  console.log(`Seeded Alpha Tech (${alphaId}) and Beta Aero (${betaId})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
