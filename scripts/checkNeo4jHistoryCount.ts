import "dotenv/config";
import { getDriver, closeDriver } from "../src/neo4j/neo4jClient";

async function main() {
  const session = getDriver().session();
  try {
    const result = await session.run("MATCH (h:HistoricalRFQ) RETURN count(h) AS count");
    console.log("HistoricalRFQ count:", result.records[0].get("count").toNumber());
  } finally {
    await session.close();
    await closeDriver();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
