import { NextRequest, NextResponse } from "next/server";
import { getCensusMetrics, resolveLocationGeography } from "@/lib/census";
import { calculateOpportunityScore, calculateScoreBreakdown } from "@/lib/scoring";
import { demoReport } from "@/lib/mock-data";
import { getDatabaseErrorMessage } from "@/lib/db";
import { generateReportNarrative } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { assertCanGenerateReport, ensureBillingSchema } from "@/lib/billing";
import { getPrismaClient } from "@/lib/prisma";

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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in to generate and save market reports." }, { status: 401 });
    }

    const usageCheck = await assertCanGenerateReport(user?.id);
    if (!usageCheck.allowed) {
      return NextResponse.json({ error: usageCheck.error, billing: usageCheck.billing }, { status: 402 });
    }

    const [, stateName] = String(body.location || "").split(",").map((x: string) => x.trim());
    const resolved = await resolveLocationGeography(String(body.location || ""));
    const state = resolved?.state || stateCodes[stateName?.toUpperCase()] || stateCodes[stateName] || "48";
    let metrics = null;
    let county: string | undefined = resolved?.county;
    let place: string | undefined = resolved?.place;

    if (county || place) {
      metrics = await getCensusMetrics({ state, county, place });
    }

    const base = {
      ...demoReport,
      id: crypto.randomUUID(),
      businessType: body.businessType || demoReport.businessType,
      locationName: body.location || demoReport.locationName,
      geographyType: place ? ("place" as const) : ("county" as const),
      stateCode: state,
      countyCode: county,
      placeCode: place,
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
    const prisma = getPrismaClient();
    if (!prisma) {
      return NextResponse.json({ error: "Database is not configured." }, { status: 500 });
    }

    try {
      await ensureBillingSchema();
      await prisma.$transaction(async (tx) => {
        await tx.report.create({
          data: {
            id: report.id,
            userId: user.id,
            businessType: report.businessType,
            locationName: report.locationName,
            geographyType: report.geographyType,
            stateCode: report.stateCode || null,
            countyCode: report.countyCode || null,
            placeCode: report.placeCode || null,
            radius: report.radius,
            targetCustomer: report.targetCustomer,
            reportType: report.reportType,
            opportunityScore: report.opportunityScore,
            aiSummary: report.aiSummary,
            riskSummary: report.riskSummary,
            recommendation: report.recommendation,
            reportJson: { details, scoreBreakdown: report.scoreBreakdown, dataSource: report.dataSource },
          },
        });

        await tx.censusMetric.createMany({
          data: Object.entries(report.metrics).map(([metricName, metricValue]) => ({
            reportId: report.id,
            metricName,
            metricValue: Number(metricValue),
            sourceYear: 2023,
          })),
        });

        await tx.aiSummary.create({
          data: {
            reportId: report.id,
            executiveSummary: details.executiveSummary,
            risks: JSON.stringify(details.risks),
            idealCustomer: details.idealCustomer,
            marketingAngle: details.marketingAngle,
            recommendation: JSON.stringify({
              finalRecommendation: details.finalRecommendation,
              whyThisLocationWorks: details.whyThisLocationWorks,
              suggestedNextSteps: details.suggestedNextSteps,
              demandDrivers: details.demandDrivers,
            }),
            structuredJson: { details },
          },
        });

        await tx.usageEvent.create({
          data: {
            userId: user.id,
            reportId: report.id,
            eventType: "report_generated",
            plan: usageCheck.billing.plan,
            metadata: { businessType: report.businessType, locationName: report.locationName },
          },
        });
      });
    } catch (error) {
      console.error("Report database save failed", error);
      return NextResponse.json({ error: getDatabaseErrorMessage(error), report, saved: false }, { status: 500 });
    }

    return NextResponse.json({ report, source: metrics ? "census" : "demo", saved: true });
  } catch (error) {
    console.error("Report generation failed", error);
    return NextResponse.json({ error: "Unable to generate report. Please check the location and try again." }, { status: 500 });
  }
}
