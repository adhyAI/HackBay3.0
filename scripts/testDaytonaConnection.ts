import "dotenv/config";
import { Daytona } from "@daytona/sdk";

async function main() {
  const daytona = new Daytona({
    apiKey: process.env.DAYTONA_API_KEY,
    apiUrl: process.env.DAYTONA_API_URL,
  });

  console.log("Creating sandbox...");
  const sandbox = await daytona.create({ language: "typescript" });
  console.log("Sandbox created:", sandbox.id);

  const response = await sandbox.process.executeCommand('echo "hello from daytona"');
  console.log("Command output:", response.result);

  console.log("Cleaning up sandbox...");
  await sandbox.delete();
  console.log("Done.");
}

main().catch((err) => {
  console.error("Daytona connection test failed:", err);
  process.exit(1);
});
