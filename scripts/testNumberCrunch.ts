import "dotenv/config";
import { runNumberCrunch } from "../src/daytona/daytonaClient";

async function main() {
  const result = await runNumberCrunch({
    partDescription: "Precision Bearing Assembly, ISO class 6",
    quantity: 500,
    diagramNote: "Drawing rev C, bore dia 22mm, outer dia 44mm",
  });
  console.log("Number crunch result:", result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
