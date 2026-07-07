import neo4j from "neo4j-driver";
import { getDriver } from "./neo4jClient";

export interface SimilarRfq {
  customerName: string;
  partDescription: string;
  quantity: number;
  vendorName: string;
  vendorLandingCost: number;
  markupPercent: number;
  finalPrice: number;
  quotedAt: string;
}

/**
 * Finds historically similar RFQs by part-description keyword overlap and
 * quantity proximity, ordered by closeness. Keyword/quantity matching is
 * intentionally simple (no embeddings) for a prototype-speed lookup.
 */
export async function similarHistoricalRfqs(
  partKeyword: string,
  quantity: number,
  limit = 5
): Promise<SimilarRfq[]> {
  const session = getDriver().session();
  try {
    const result = await session.run(
      `
      MATCH (cust:Customer)-[:SUBMITTED]->(h:HistoricalRFQ)-[:RESULTED_IN]->(q:Quote)
      WHERE toLower(h.part_description) CONTAINS toLower($partKeyword)
         OR toLower($partKeyword) CONTAINS toLower(h.part_description)
      WITH cust, h, q, abs(h.quantity - $quantity) AS quantityDiff
      RETURN cust.name AS customerName,
             h.part_description AS partDescription,
             h.quantity AS quantity,
             q.vendor_name AS vendorName,
             q.vendor_landing_cost AS vendorLandingCost,
             q.markup_percent AS markupPercent,
             q.final_price AS finalPrice,
             q.quoted_at AS quotedAt
      ORDER BY quantityDiff ASC
      LIMIT $limit
      `,
      { partKeyword, quantity, limit: neo4j.int(limit) }
    );

    return result.records.map((record) => ({
      customerName: record.get("customerName"),
      partDescription: record.get("partDescription"),
      quantity: record.get("quantity"),
      vendorName: record.get("vendorName"),
      vendorLandingCost: record.get("vendorLandingCost"),
      markupPercent: record.get("markupPercent"),
      finalPrice: record.get("finalPrice"),
      quotedAt: record.get("quotedAt"),
    }));
  } finally {
    await session.close();
  }
}
