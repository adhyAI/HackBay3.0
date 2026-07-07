import neo4j, { Driver } from "neo4j-driver";

let driver: Driver | null = null;

/** Pooled Neo4j Aura driver singleton — reused across requests. */
export function getDriver(): Driver {
  if (driver) return driver;

  const uri = process.env.NEO4J_URI ?? "";
  const user = process.env.NEO4J_USER ?? "";
  const password = process.env.NEO4J_PASSWORD ?? "";

  driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
    maxConnectionPoolSize: 50,
    connectionAcquisitionTimeout: 10_000,
    maxTransactionRetryTime: 15_000,
  });

  return driver;
}

export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}
