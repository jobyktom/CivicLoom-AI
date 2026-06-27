import { getDbPool } from "@/lib/db";
import { ensureBillingSchema } from "@/lib/billing";
import { demoReport } from "@/lib/mock-data";
import { calculateScoreBreakdown } from "@/lib/scoring";
import type { CensusMetrics, Report, ReportDetails, ScoreBreakdown } from "@/lib/types";

type ReportRow = {
  id: string;
  business_type: string;
  location_name: string;
  geography_type: "place" | "county";
  state_code: string | null;
  county_code: string | null;
  place_code: string | null;
  radius: number | null;
  target_customer: string | null;
  report_type: string | null;
  opportunity_score: number | null;
  ai_summary: string | null;
  risk_summary: string | null;
  recommendation: string | null;
  report_json: string | object | null;
  created_at: Date;
};

type MetricRow = {
  metric_name: keyof CensusMetrics;
  metric_value: number | null;
};

type AiRow = {
  executive_summary: string | null;
  risks: string | null;
  ideal_customer: string | null;
  marketing_angle: string | null;
  recommendation: string | null;
  structured_json?: string | object | null;
};

type StoredReportJson = {
  details?: Partial<ReportDetails>;
  scoreBreakdown?: ScoreBreakdown;
  dataSource?: "census" | "demo";
};

function parseJsonObject<T>(value: unknown): Partial<T> {
  if (!value) return {};
  if (typeof value === "object") return value as Partial<T>;
  if (typeof value !== "string") return {};
  try {
    return JSON.parse(value) as Partial<T>;
  } catch {
    return {};
  }
}

function parseArray(value: string | null, fallback: string[]) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : fallback;
  } catch {
    const items = value
      .split(/\n|•|-/)
      .map((item) => item.trim())
      .filter(Boolean);
    return items.length ? items : fallback;
  }
}

function parseRecommendation(value: string | null) {
  if (!value) return {};
  try {
    return JSON.parse(value) as Partial<Pick<ReportDetails, "finalRecommendation" | "whyThisLocationWorks" | "suggestedNextSteps" | "demandDrivers">>;
  } catch {
    return { finalRecommendation: value };
  }
}

function coerceDetails(input: Partial<ReportDetails>, fallback: ReportDetails): ReportDetails {
  const array = (value: unknown, backup: string[]) => (Array.isArray(value) ? value.map(String).filter(Boolean) : backup);

  return {
    executiveSummary: String(input.executiveSummary || fallback.executiveSummary),
    demandAnalysis: input.demandAnalysis ? String(input.demandAnalysis) : fallback.demandAnalysis,
    incomeFit: input.incomeFit ? String(input.incomeFit) : fallback.incomeFit,
    housingInsight: input.housingInsight ? String(input.housingInsight) : fallback.housingInsight,
    employmentInsight: input.employmentInsight ? String(input.employmentInsight) : fallback.employmentInsight,
    whyThisLocationWorks: array(input.whyThisLocationWorks, fallback.whyThisLocationWorks),
    risks: array(input.risks, fallback.risks),
    idealCustomer: String(input.idealCustomer || fallback.idealCustomer),
    marketingAngle: String(input.marketingAngle || fallback.marketingAngle),
    suggestedNextSteps: array(input.suggestedNextSteps, fallback.suggestedNextSteps),
    finalRecommendation: String(input.finalRecommendation || fallback.finalRecommendation),
    demandDrivers: array(input.demandDrivers, fallback.demandDrivers),
  };
}

function legacyDetails(row: ReportRow, ai: AiRow | undefined): ReportDetails {
  const recommendationPayload = parseRecommendation(ai?.recommendation || null);
  return {
    executiveSummary: ai?.executive_summary || row.ai_summary || demoReport.details?.executiveSummary || demoReport.aiSummary,
    whyThisLocationWorks: Array.isArray(recommendationPayload.whyThisLocationWorks)
      ? recommendationPayload.whyThisLocationWorks.map(String)
      : demoReport.details?.whyThisLocationWorks || [],
    risks: parseArray(ai?.risks || row.risk_summary, demoReport.details?.risks || []),
    idealCustomer: ai?.ideal_customer || row.target_customer || demoReport.details?.idealCustomer || "Local customers",
    marketingAngle: ai?.marketing_angle || demoReport.details?.marketingAngle || "",
    suggestedNextSteps: Array.isArray(recommendationPayload.suggestedNextSteps)
      ? recommendationPayload.suggestedNextSteps.map(String)
      : demoReport.details?.suggestedNextSteps || [],
    finalRecommendation: recommendationPayload.finalRecommendation || row.recommendation || demoReport.recommendation,
    demandDrivers: Array.isArray(recommendationPayload.demandDrivers)
      ? recommendationPayload.demandDrivers.map(String)
      : demoReport.details?.demandDrivers || [],
  };
}

export async function loadReportById(id: string, ownerUserId?: string | null): Promise<Report | null> {
  const db = getDbPool();
  if (!db) return { ...demoReport, id };

  await ensureBillingSchema();

  const [reportRows] = await db.execute(
    `SELECT id,business_type,location_name,geography_type,state_code,county_code,place_code,radius,target_customer,report_type,opportunity_score,ai_summary,risk_summary,recommendation,report_json,created_at
     FROM reports
     WHERE id = ? ${ownerUserId ? "AND user_id = ?" : ""}
     LIMIT 1`,
    ownerUserId ? [id, ownerUserId] : [id],
  );
  const row = (reportRows as ReportRow[])[0];
  if (!row) return null;

  const [metricRows] = await db.execute("SELECT metric_name,metric_value FROM census_metrics WHERE report_id = ?", [id]);
  const metrics = { ...demoReport.metrics };
  for (const metric of metricRows as MetricRow[]) {
    if (metric.metric_value !== null) metrics[metric.metric_name] = Number(metric.metric_value);
  }

  const [aiRows] = await db.execute(
    "SELECT executive_summary,risks,ideal_customer,marketing_angle,recommendation,structured_json FROM ai_summaries WHERE report_id = ? ORDER BY created_at DESC LIMIT 1",
    [id],
  );
  const ai = (aiRows as AiRow[])[0];
  const stored = parseJsonObject<StoredReportJson>(row.report_json);
  const storedAi = parseJsonObject<{ details?: Partial<ReportDetails> }>(ai?.structured_json);
  const fallbackDetails = legacyDetails(row, ai);
  const details = coerceDetails(stored.details || storedAi.details || {}, fallbackDetails);
  const scoreBreakdown = stored.scoreBreakdown || calculateScoreBreakdown(metrics, row.business_type, row.target_customer || "Local customers");

  return {
    id: row.id,
    businessType: row.business_type,
    locationName: row.location_name,
    geographyType: row.geography_type,
    stateCode: row.state_code || undefined,
    countyCode: row.county_code || undefined,
    placeCode: row.place_code || undefined,
    radius: row.radius || 3,
    targetCustomer: row.target_customer || "Local customers",
    reportType: row.report_type || "Market opportunity",
    opportunityScore: row.opportunity_score || 0,
    scoreBreakdown,
    metrics,
    aiSummary: details.executiveSummary,
    riskSummary: details.risks.join(" "),
    recommendation: details.finalRecommendation,
    details,
    dataSource: stored.dataSource || "census",
    createdAt: row.created_at.toISOString().slice(0, 10),
  };
}
