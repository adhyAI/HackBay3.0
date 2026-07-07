import "dotenv/config";
import { randomUUID } from "crypto";
import { getDriver, closeDriver } from "../src/neo4j/neo4jClient";

/**
 * Generates 100 synthetic historical RFQ + quote records as organizational
 * memory for the Sales/Engineering "similar past RFQs" lookup. Templated
 * randomization over hand-rolled arrays keeps this fast and dependency-free
 * (no external LLM call needed for a prototype dataset).
 */
const CUSTOMERS = [
  "Meridian Robotics", "Northgate Electronics", "Cascade Circuits", "Skyward Aerostructures",
  "Orbital Hydraulics Group", "Ferrovia Avionics", "Ionix Manufacturing", "Redline Motorsports",
  "Continental Fasteners", "Blue Anchor Marine", "Summit Turbine Works", "Vantage Precision",
  "Harbor Point Electronics", "Trailblazer Industrial", "Keystone Aerospace", "Delta Wave Systems",
  "Granite Machining Co", "Apex Composite Structures", "Northfield Robotics", "Coastal Circuit Supply",
];

const PARTS = [
  { description: "Precision Bearing Assembly", material: "Steel", baseUnitCost: 8.5 },
  { description: "Finned Aluminum Heat Sink", material: "Aluminum", baseUnitCost: 3.2 },
  { description: "Circuit Board Connector", material: "Gold-plated copper", baseUnitCost: 1.1 },
  { description: "Titanium Turbine Blade", material: "Titanium Grade 5", baseUnitCost: 145 },
  { description: "Hydraulic Actuator", material: "Stainless Steel", baseUnitCost: 62 },
  { description: "Avionics Wiring Harness", material: "Shielded copper", baseUnitCost: 28 },
  { description: "CNC Machined Bracket", material: "Aluminum 6061", baseUnitCost: 6.4 },
  { description: "Injection Molded Housing", material: "ABS Plastic", baseUnitCost: 2.1 },
  { description: "Custom Gearbox Assembly", material: "Hardened Steel", baseUnitCost: 210 },
  { description: "Fastener Kit (M6 bolts)", material: "Zinc-plated steel", baseUnitCost: 0.35 },
];

const VENDORS = [
  "Pacific Rim Fabrication", "Titan Metal Supply", "Precision Cast Partners",
  "Ironclad Machining", "Global Forge Solutions", "Summit Alloy Works",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysBack: number): string {
  const d = new Date(Date.now() - Math.random() * daysBack * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

const SEED_ONE = `
MERGE (cust:Customer {name: $customerName})
CREATE (h:HistoricalRFQ {
  id: $id,
  part_description: $partDescription,
  material: $material,
  quantity: $quantity,
  submitted_at: $submittedAt
})
CREATE (cust)-[:SUBMITTED]->(h)
CREATE (q:Quote {
  vendor_name: $vendorName,
  vendor_landing_cost: $vendorLandingCost,
  markup_percent: $markupPercent,
  final_price: $finalPrice,
  quoted_at: $quotedAt
})
CREATE (h)-[:RESULTED_IN]->(q)
`;

async function main() {
  const session = getDriver().session();
  try {
    for (let i = 0; i < 100; i++) {
      const part = pick(PARTS);
      const quantity = Math.round(10 + Math.random() * 990);
      const vendorLandingCost = Math.round(part.baseUnitCost * quantity * (0.9 + Math.random() * 0.3) * 100) / 100;
      const markupPercent = Math.round(10 + Math.random() * 25);
      const finalPrice = Math.round(vendorLandingCost * (1 + markupPercent / 100) * 100) / 100;
      const submittedAt = randomDate(730);

      await session.run(SEED_ONE, {
        id: randomUUID(),
        customerName: pick(CUSTOMERS),
        partDescription: part.description,
        material: part.material,
        quantity,
        submittedAt,
        vendorName: pick(VENDORS),
        vendorLandingCost,
        markupPercent,
        finalPrice,
        quotedAt: submittedAt,
      });
    }
    console.log("Seeded 100 synthetic HistoricalRFQ + Quote records");
  } finally {
    await session.close();
    await closeDriver();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
