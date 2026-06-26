import { NextRequest, NextResponse } from "next/server";
import { getCensusMetrics, resolveLocationGeography } from "@/lib/census";
import { calculateOpportunityScore, calculateScoreBreakdown } from "@/lib/scoring";
import { demoReport } from "@/lib/mock-data";
import { getDatabaseErrorMessage, getDbPool } from "@/lib/db";
import { generateReportNarrative } from "@/lib/ai";

const stateCodes: Record<string, string> = {
  TEXAS: "48",
  TX: "48",
  CALIFORNIA: "06",
  CA: "06",
  "NEW YORK": "36",
  NY: "36",
  "NORTH CAROLINA": "37",
  NC: "37",
  ARIZONA: "04",
  AZ: "04",
  FLORIDA: "12",
  FL: "12",
  ILLINOIS: "17",
  IL: "17",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const [, stateName] = String(body.location || "").split(",").map((x: string) => x.trim());
    const resolved = await resolveLocationGeography(String(body.location || ""));
    const state = resolved?.state || stateCodes[stateName?.toUpperCase()] || stateCodes[stateName] || "48";
    let metrics = null;
    let county: string | undefined = resolved?.county;

    if (county) {
      metrics = county ? await getCensusMetrics({ state, county }) : null;
    }

    const base = {
      ...demoReport,
      id: crypto.randomUUID(),
      businessType: body.businessType || demoReport.businessType,
      locationName: body.location || demoReport.locationName,
      geographyType: "county" as const,
      stateCode: state,
      countyCode: county,
      targetCustomer: body.targetCustomer || demoReport.targetCustomer,
      radius: Number(body.radius) || 3,
      reportType: body.reportType || demoReport.reportType,
      createdAt: new Date().toISOString().slice(0, 10),
      metrics: metrics || demoReport.metrics,
      dataSource: metrics ? ("census" as const) : ("demo" as const),
    };

    const scoredReport = {
      ...base,
      opportunityScore: calculateOpportunityScore(base.metrics, base.businessType, base.targetCustomer),
      scoreBreakdown: calculateScoreBreakdown(base.metrics, base.businessType, base.targetCustomer),
    };
    const details = await generateReportNarrative(scoredReport);
    const report = {
      ...scoredReport,
      aiSummary: details.executiveSummary,
      riskSummary: details.risks.join(" "),
      recommendation: details.finalRecommendation,
      details,
    };
    const db = getDbPool();

    if (db) {
      try {
        await db.execute(
          "INSERT INTO reports (id,user_id,business_type,location_name,geography_type,state_code,county_code,place_code,radius,target_customer,report_type,opportunity_score,ai_summary,risk_summary,recommendation) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
          [
            report.id,
            body.userId || null,
            report.businessType,
            report.locationName,
            report.geographyType,
            report.stateCode || null,
            report.countyCode || null,
            report.placeCode || null,
            report.radius,
            report.targetCustomer,
            report.reportType,
            report.opportunityScore,
            report.aiSummary,
            report.riskSummary,
            report.recommendation,
          ],
        );
        await db.query("INSERT INTO census_metrics (report_id,metric_name,metric_value,source_year) VALUES ?", [
          Object.entries(report.metrics).map(([metricName, metricValue]) => [report.id, metricName, metricValue, 2023]),
        ]);
        await db.execute("INSERT INTO ai_summaries (report_id,executive_summary,risks,ideal_customer,marketing_angle,recommendation) VALUES (?,?,?,?,?,?)", [
          report.id,
          details.executiveSummary,
          JSON.stringify(details.risks),
          details.idealCustomer,
          details.marketingAngle,
          JSON.stringify({
            finalRecommendation: details.finalRecommendation,
            whyThisLocationWorks: details.whyThisLocationWorks,
            suggestedNextSteps: details.suggestedNextSteps,
            demandDrivers: details.demandDrivers,
          }),
        ]);
      } catch (error) {
        console.error("Report database save failed", error);
        return NextResponse.json({ error: getDatabaseErrorMessage(error), report, saved: false }, { status: 500 });
      }
    }

    return NextResponse.json({ report, source: metrics ? "census" : "demo", saved: Boolean(db) });
  } catch (error) {
    console.error("Report generation failed", error);
    return NextResponse.json({ error: "Unable to generate report. Please check the location and try again." }, { status: 500 });
  }
}
