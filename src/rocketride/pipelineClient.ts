import path from "path";
import { RocketRideClient } from "rocketride";

let client: RocketRideClient | null = null;
let taskToken: string | null = null;

const PIPELINE_PATH = path.join(__dirname, "..", "..", "rocketride", "rfq_pipeline.pipe");

function isConfigured(): boolean {
  return Boolean(process.env.ROCKETRIDE_URI && process.env.ROCKETRIDE_APIKEY);
}

async function ensureStarted(): Promise<string> {
  if (!client) {
    client = new RocketRideClient({
      uri: process.env.ROCKETRIDE_URI,
      auth: process.env.ROCKETRIDE_APIKEY,
    });
    await client.connect();
  }
  if (!taskToken) {
    const result = await client.use({ filepath: PIPELINE_PATH });
    taskToken = result.token;
  }
  return taskToken;
}

/**
 * Hands an incoming RFQ off to the real RocketRide cloud pipeline
 * (rfq_pipeline.pipe): its agent crunches numbers via Daytona, looks up
 * history via Neo4j, and writes the result back into rfq_cards via the
 * Butterbase MCP tool. Fire-and-forget from the caller's perspective — the
 * card itself is already created in Butterbase before this is called, so a
 * RocketRide outage never blocks card creation.
 */
export async function sendRfqToRocketRide(payload: Record<string, unknown>): Promise<void> {
  if (!isConfigured()) {
    console.warn("RocketRide not configured (ROCKETRIDE_URI/ROCKETRIDE_APIKEY missing) — skipping agent hand-off.");
    return;
  }

  const token = await ensureStarted();
  await client!.send(token, JSON.stringify(payload));
}
