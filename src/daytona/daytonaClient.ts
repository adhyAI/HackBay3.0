import { Daytona } from "@daytona/sdk";

let client: Daytona | null = null;

function getClient(): Daytona {
  if (client) return client;
  client = new Daytona({
    apiKey: process.env.DAYTONA_API_KEY,
    apiUrl: process.env.DAYTONA_API_URL,
  });
  return client;
}

export interface NumberCrunchInput {
  partDescription: string;
  quantity: number;
  diagramNote?: string | null;
}

export interface NumberCrunchOutput {
  unitMaterialCost: number;
  wasteFactor: number;
  totalMaterialCost: number;
  laborHoursEstimate: number;
  computedAt: string;
  sandboxId: string;
}

/**
 * Spins up a real Daytona sandbox and runs a small script that estimates a
 * materials/labor cost breakdown from the RFQ's structured data. There's no
 * real CAD/PDF parsing yet, so the sandbox script uses a simple deterministic
 * formula seeded by quantity + part description length as a stand-in for a
 * future engineering calculation.
 */
export async function runNumberCrunch(input: NumberCrunchInput): Promise<NumberCrunchOutput> {
  const daytona = getClient();
  const sandbox = await daytona.create({ language: "typescript" });

  try {
    const script = `
      const quantity = ${input.quantity};
      const complexity = ${JSON.stringify(input.partDescription)}.length + ${JSON.stringify(input.diagramNote ?? "")}.length;
      const unitMaterialCost = Math.round((5 + complexity * 0.15) * 100) / 100;
      const wasteFactor = 0.08;
      const totalMaterialCost = Math.round(unitMaterialCost * quantity * (1 + wasteFactor) * 100) / 100;
      const laborHoursEstimate = Math.round((quantity / 40 + complexity * 0.02) * 100) / 100;
      console.log(JSON.stringify({ unitMaterialCost, wasteFactor, totalMaterialCost, laborHoursEstimate }));
    `;

    const response = await sandbox.process.codeRun(script);
    const jsonLine = response.result
      .split("\n")
      .map((line) => line.trim())
      .reverse()
      .find((line) => line.startsWith("{") && line.endsWith("}"));

    if (!jsonLine) {
      throw new Error(`Daytona sandbox produced no parseable JSON output: ${response.result}`);
    }

    const parsed = JSON.parse(jsonLine);
    return { ...parsed, computedAt: new Date().toISOString(), sandboxId: sandbox.id };
  } finally {
    await sandbox.delete();
  }
}
