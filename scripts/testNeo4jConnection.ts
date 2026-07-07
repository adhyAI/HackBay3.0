import "dotenv/config";
import { getDriver, closeDriver } from "../src/neo4j/neo4jClient";

async function main() {
  const driver = getDriver();
  const info = await driver.getServerInfo();
  console.log("Connected to Neo4j:", info.address, info.protocolVersion);
  await closeDriver();
}

main().catch((err) => {
  console.error("Connection failed:", err.message);
  process.exit(1);
});
