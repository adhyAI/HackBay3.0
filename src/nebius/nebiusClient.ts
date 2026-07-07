import fetch from "node-fetch";

const BASE_URL = process.env.NEBIUS_BASE_URL ?? "https://api.tokenfactory.nebius.com/v1";
const API_KEY = process.env.NEBIUS_API_KEY ?? "";
const MODEL = "meta-llama/Llama-3.3-70B-Instruct";

export interface ParsedRfq {
  part_description: string;
  quantity: number;
  diagram_note: string;
}

/**
 * Extracts structured RFQ fields from a raw inbound email using a real LLM
 * call (Nebius Token Factory's OpenAI-compatible chat API) — the "Sales
 * Review" parsing step. There's no PDF/OCR parsing yet, so extraction is
 * text-only, over the email subject + body.
 */
export async function parseRfqEmail(emailSubject: string | null, emailBody: string | null): Promise<ParsedRfq> {
  const prompt = `Extract structured fields from this RFQ (request for quote) email. Respond with ONLY a JSON object, no other text, in the exact shape:
{"part_description": string, "quantity": number, "diagram_note": string}

part_description: the part/product being requested.
quantity: the number of units requested, as a plain integer.
diagram_note: any spec/dimension/material detail mentioned (tolerances, dimensions, materials, ratings). If none, use an empty string.

Email subject: ${emailSubject ?? "(none)"}
Email body:
${emailBody ?? "(none)"}`;

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    }),
  });

  if (!res.ok) {
    throw new Error(`Nebius parse request failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  const content = data.choices[0].message.content;

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Nebius parse response had no JSON object: ${content}`);
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    part_description: String(parsed.part_description ?? "Unspecified part"),
    quantity: Number(parsed.quantity ?? 0),
    diagram_note: String(parsed.diagram_note ?? ""),
  };
}
