import type { RfqCardDto } from "./api";

export const STAGES = [
  { id: "received", label: "Request", description: "Inbound RFQ email + PDF" },
  { id: "sales_review", label: "Sales Review", description: "Sales checks terms & pricing" },
  { id: "engineering_review", label: "Engineering Review", description: "Daytona sandbox crunches specs" },
  { id: "vendor_quote", label: "Vendor RFQ", description: "Outbound to suppliers" },
  { id: "customer_sent", label: "Customer Quote", description: "Final quote sent" },
] as const;

export type StageId = (typeof STAGES)[number]["id"];

export type LineItem = {
  partNumber: string;
  description: string;
  qty: number;
  material: string;
  unitCostUsd?: number;
};

export type SimilarPastRfq = {
  id: string;
  customer: string;
  wonUsd: number;
};

export type Rfq = {
  id: string;
  tenantId: string;
  stage: StageId;
  customer: string;
  contact: string;
  subject: string;
  receivedAt: string;
  emailBody: string;
  pdfName: string;
  lineItems: LineItem[];
  agentNotes: string[];
  vendorName: string | null;
  vendorLandingCost: number | null;
  markupPct: number;
  finalQuote: number | null;
  similarPastRfqs: SimilarPastRfq[];
  daytonaRunId?: string;
  daytonaOutput: RfqCardDto["daytona_output"];
  isParsed: boolean;
};

function basename(path: string | null): string {
  if (!path) return "attachment.pdf";
  const parts = path.split("/");
  return parts[parts.length - 1];
}

/** Adapts a raw Butterbase rfq_cards row into the shape this UI renders. */
export function mapCardToRfq(card: RfqCardDto): Rfq {
  const quantity = card.quantity != null ? Number(card.quantity) : 0;
  const vendorLandingCost = card.vendor_landing_cost != null ? Number(card.vendor_landing_cost) : null;
  const isParsed = Boolean(card.part_description);

  const agentNotes: string[] = [];
  if (!isParsed) {
    agentNotes.push("Not yet parsed — move to Sales Review to extract part/quantity from the email.");
  }
  if (card.daytona_output) {
    agentNotes.push(
      `Daytona sandbox estimated $${card.daytona_output.unitMaterialCost.toFixed(2)}/unit material cost, ` +
        `${card.daytona_output.laborHoursEstimate}h labor (sandbox ${card.daytona_output.sandboxId ?? "n/a"})`
    );
  }
  if (card.similar_rfqs?.items?.length) {
    agentNotes.push(`Matched ${card.similar_rfqs.items.length} similar historical RFQs via Neo4j`);
  }
  if (card.sales_notes) agentNotes.push(`Sales: ${card.sales_notes}`);
  if (card.engineering_notes) agentNotes.push(`Engineering: ${card.engineering_notes}`);

  return {
    id: card.id,
    tenantId: card.tenant_id,
    stage: card.stage as StageId,
    customer: card.customer_name,
    contact: card.customer_email,
    subject: card.email_subject ?? "(no subject)",
    receivedAt: card.created_at,
    emailBody: card.email_body ?? "",
    pdfName: basename(card.pdf_url),
    lineItems: isParsed
      ? [
          {
            partNumber: card.id.slice(0, 8).toUpperCase(),
            description: card.part_description!,
            qty: quantity,
            material: card.diagram_note ?? "",
            unitCostUsd: vendorLandingCost && quantity ? vendorLandingCost / quantity : undefined,
          },
        ]
      : [],
    agentNotes,
    vendorName: card.vendor_name,
    vendorLandingCost,
    markupPct: Number(card.markup_percent ?? 20),
    finalQuote: card.final_quote != null ? Number(card.final_quote) : null,
    similarPastRfqs: (card.similar_rfqs?.items ?? []).map((r, i) => ({
      id: `${r.customerName.replace(/\s+/g, "-")}-${i}`,
      customer: r.customerName,
      wonUsd: r.finalPrice,
    })),
    daytonaRunId: card.daytona_output?.sandboxId,
    daytonaOutput: card.daytona_output,
    isParsed,
  };
}
