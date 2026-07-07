import "dotenv/config";
import { RocketRideClient, AuthenticationException, ConnectionException } from "rocketride";
import fs from "fs";
import path from "path";

/**
 * Sanity check for the RFQ RocketRide pipeline: connects, validates the
 * pipeline config (no execution), and reports clearly whether credentials
 * or the pipeline definition itself are the problem.
 */
async function main() {
  const uri = process.env.ROCKETRIDE_URI;
  const apikey = process.env.ROCKETRIDE_APIKEY;

  if (!uri || !apikey) {
    console.error(
      "Missing ROCKETRIDE_URI / ROCKETRIDE_APIKEY in .env — set these from your RocketRide account before running this check."
    );
    process.exit(1);
  }

  const pipelinePath = path.join(__dirname, "rfq_pipeline.pipe");
  const pipeline = JSON.parse(fs.readFileSync(pipelinePath, "utf-8"));

  const client = new RocketRideClient({ uri, auth: apikey });

  try {
    console.log(`Connecting to ${uri}...`);
    await client.connect();
    console.log("Connected.");

    console.log("Validating rfq_pipeline.pipe...");
    const result = await client.validate({ pipeline });

    if (result.errors?.length) {
      console.error("Pipeline INVALID:");
      for (const e of result.errors) console.error(" -", e);
      process.exitCode = 1;
    } else {
      console.log("Pipeline is valid.");
      if (result.warnings?.length) {
        console.warn("Warnings:");
        for (const w of result.warnings) console.warn(" -", w);
      }
    }
  } catch (err) {
    if (err instanceof AuthenticationException) {
      console.error("Authentication failed — check ROCKETRIDE_APIKEY.");
    } else if (err instanceof ConnectionException) {
      console.error("Could not reach RocketRide server — check ROCKETRIDE_URI.");
    } else {
      console.error("Unexpected error:", err);
    }
    process.exitCode = 1;
  } finally {
    await client.disconnect();
  }
}

main();
