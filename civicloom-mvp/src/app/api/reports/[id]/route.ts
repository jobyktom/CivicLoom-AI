import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { demoReport } from "@/lib/mock-data";
import { calculateScoreBreakdown } from "@/lib/scoring";
import type { CensusMetrics, Report, ReportDetails } from "@/lib/types";

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
};

function parseArray(value: string | null, fallback: string[]) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : fallback;
  } catch {
    return value
      .split(/\n|•|-/)
      .map((item) => item.trim())
      .filter(Boolean) || fallback;
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

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDbPool();

  if (!db) {
    return NextResponse.json({ report: { ...demoReport, id }, source: "demo" });
  }

  const [reportRows] = await db.execute(
    "SELECT id,business_type,location_name,geography_type,state_code,county_code,place_code,radius,target_customer,report_type,opportunity_score,ai_summary,risk_summary,recommendation,created_at FROM reports WHERE id = ? LIMIT 1",
    [id],
  );
  const row = (reportRows as ReportRow[])[0];

  if (!row) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  const [metricRows] = await db.execute("SELECT metric_name,metric_value FROM census_metrics WHERE report_id = ?", [id]);
  const metrics = { ...demoReport.metrics };

  for (const metric of metricRows as MetricRow[]) {
    if (metric.metric_value !== null) metrics[metric.metric_name] = Number(metric.metric_value);
  }

  const [aiRows] = await db.execute(
    "SELECT executive_summary,risks,ideal_customer,marketing_angle,recommendation FROM ai_summaries WHERE report_id = ? ORDER BY created_at DESC LIMIT 1",
    [id],
  );
  const ai = (aiRows as AiRow[])[0];
  const recommendationPayload = parseRecommendation(ai?.recommendation || null);
  const details: ReportDetails = {
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

  const report: Report = {
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
    scoreBreakdown: calculateScoreBreakdown(metrics, row.business_type, row.target_customer || "Local customers"),
    metrics,
    aiSummary: details.executiveSummary,
    riskSummary: details.risks.join(" "),
    recommendation: details.finalRecommendation,
    details,
    dataSource: "census",
    createdAt: row.created_at.toISOString().slice(0, 10),
  };

  return NextResponse.json({ report, source: "mysql" });
}
