import "dotenv/config";
import { getDriver, closeDriver } from "../src/neo4j/neo4jClient";

/**
 * Seeds a small demo graph for Alpha Tech matching the model riskQuery.ts expects:
 *   Tenant-OWNS->RFQ-REQUIRES->Part-SUPPLIED_BY->Supplier-LOCATED_IN->Country
 * The RFQ id here must match the rfq_id used in a /api/webhook/rfq-ingest call
 * for the risk score to resolve (otherwise the query falls back to a default).
 */
const ALPHA_TENANT_ID = "9e7bd1b2-61b5-43f7-9679-8ac8339d0981";
const DEMO_RFQ_ID = "demo-rfq-alpha-001";

const SEED_CYPHER = `
MERGE (t:Tenant {id: $tenantId})
MERGE (r:RFQ {id: $rfqId})
MERGE (t)-[:OWNS]->(r)

MERGE (p1:Part {part_number: "AT-1001"})
MERGE (p2:Part {part_number: "AT-1002"})
MERGE (r)-[:REQUIRES]->(p1)
MERGE (r)-[:REQUIRES]->(p2)

MERGE (s1:Supplier {name: "Shenzhen Precision Co"}) SET s1.lead_time_days = 45
MERGE (s2:Supplier {name: "Midwest Metal Works"}) SET s2.lead_time_days = 12
MERGE (p1)-[:SUPPLIED_BY]->(s1)
MERGE (p2)-[:SUPPLIED_BY]->(s2)

MERGE (c1:Country {name: "China"}) SET c1.risk_index = 0.6
MERGE (c2:Country {name: "United States"}) SET c2.risk_index = 0.15
MERGE (s1)-[:LOCATED_IN]->(c1)
MERGE (s2)-[:LOCATED_IN]->(c2)
`;

async function main() {
  const session = getDriver().session();
  try {
    await session.run(SEED_CYPHER, { tenantId: ALPHA_TENANT_ID, rfqId: DEMO_RFQ_ID });
    console.log(`Seeded demo graph for tenant ${ALPHA_TENANT_ID}, rfq_id="${DEMO_RFQ_ID}"`);
  } finally {
    await session.close();
    await closeDriver();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
