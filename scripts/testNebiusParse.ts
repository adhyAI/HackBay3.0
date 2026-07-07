import "dotenv/config";
import { parseRfqEmail } from "../src/nebius/nebiusClient";

async function main() {
  const result = await parseRfqEmail(
    "RFQ: Stainless steel gearbox housing x 100",
    "Hi team,\n\nPlease find attached our RFQ for 100 units of the Stainless steel gearbox housing.\nWall thickness 4mm, IP67 rated.\nLet us know pricing and lead time.\n\nThanks,\nSable Robotics"
  );
  console.log("Parsed:", result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
