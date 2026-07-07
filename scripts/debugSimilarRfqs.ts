import "dotenv/config";
import { similarHistoricalRfqs } from "../src/neo4j/historyQuery";
import { closeDriver } from "../src/neo4j/neo4jClient";

async function main() {
  const result = await similarHistoricalRfqs("Precision Bearing Assembly, ISO class 6", 500);
  console.log(JSON.stringify(result, null, 2));
  await closeDriver();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
