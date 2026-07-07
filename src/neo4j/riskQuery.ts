import { getDriver } from "./neo4jClient";

/**
 * Graph model assumed (not yet introspected against a live Aura instance):
 *   (:Tenant)-[:OWNS]->(:RFQ)-[:REQUIRES]->(:Part)-[:SUPPLIED_BY]->(:Supplier)-[:LOCATED_IN]->(:Country)
 * Supplier nodes carry `lead_time_days`; Country nodes carry `risk_index` (0-1).
 */
export const RISK_QUERY = `
MATCH (t:Tenant {id: $tenantId})-[:OWNS]->(r:RFQ {id: $rfqId})
MATCH (r)-[:REQUIRES]->(p:Part)
MATCH (p)-[:SUPPLIED_BY]->(s:Supplier)-[:LOCATED_IN]->(c:Country)
WITH r, p, s, c,
     coalesce(s.lead_time_days, 30) AS leadTime,
     coalesce(c.risk_index, 0.5) AS countryRisk
WITH r,
     avg(leadTime) AS avgLeadTime,
     avg(countryRisk) AS avgCountryRisk,
     count(DISTINCT p) AS partCount
RETURN r.id AS rfqId,
       round(((avgLeadTime / 60.0) * 0.5 + avgCountryRisk * 0.5) * 100) AS safety_risk_score,
       avgLeadTime,
       avgCountryRisk,
       partCount
`;

export interface RiskResult {
  rfqId: string;
  safety_risk_score: number;
  avgLeadTime: number;
  avgCountryRisk: number;
  partCount: number;
}

/**
 * Runs the multi-tier supply chain risk query for a given tenant + RFQ.
 * Returns a default (unknown) score if no matching graph path exists yet —
 * e.g. before the RFQ/Part/Supplier nodes have been created in Neo4j.
 */
export async function calculateSafetyRiskScore(
  tenantId: string,
  rfqId: string
): Promise<RiskResult> {
  const session = getDriver().session();
  try {
    const result = await session.run(RISK_QUERY, { tenantId, rfqId });
    if (result.records.length === 0) {
      return { rfqId, safety_risk_score: 50, avgLeadTime: 30, avgCountryRisk: 0.5, partCount: 0 };
    }
    const record = result.records[0];
    return {
      rfqId: record.get("rfqId"),
      safety_risk_score: record.get("safety_risk_score"),
      avgLeadTime: record.get("avgLeadTime"),
      avgCountryRisk: record.get("avgCountryRisk"),
      partCount: record.get("partCount").toNumber?.() ?? record.get("partCount"),
    };
  } finally {
    await session.close();
  }
}
