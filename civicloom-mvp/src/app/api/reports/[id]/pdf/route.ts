import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import { getDbPool } from "@/lib/db";
import { demoReport } from "@/lib/mock-data";
import { calculateScoreBreakdown } from "@/lib/scoring";
import type { CensusMetrics, Report, ReportDetails } from "@/lib/types";

export const runtime = "nodejs";

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

type MetricRow = { metric_name: keyof CensusMetrics; metric_value: number | null };
type AiRow = {
  executive_summary: string | null;
  risks: string | null;
  ideal_customer: string | null;
  marketing_angle: string | null;
  recommendation: string | null;
};

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const fmt = (value: number) => new Intl.NumberFormat("en-US").format(Math.round(value));
const pct = (value: number) => `${Math.round(value)}%`;

function parseArray(value: string | null, fallback: string[]) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : fallback;
  } catch {
    return value
      .split(/\n|•|-/)
      .map((item) => item.trim())
      .filter(Boolean);
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

async function loadReport(id: string): Promise<Report | null> {
  const db = getDbPool();
  if (!db) return { ...demoReport, id };

  const [reportRows] = await db.execute(
    "SELECT id,business_type,location_name,geography_type,state_code,county_code,place_code,radius,target_customer,report_type,opportunity_score,ai_summary,risk_summary,recommendation,created_at FROM reports WHERE id = ? LIMIT 1",
    [id],
  );
  const row = (reportRows as ReportRow[])[0];
  if (!row) return null;

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
    executiveSummary: ai?.executive_summary || row.ai_summary || demoReport.aiSummary,
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
    scoreBreakdown: calculateScoreBreakdown(metrics, row.business_type, row.target_customer || "Local customers"),
    metrics,
    aiSummary: details.executiveSummary,
    riskSummary: details.risks.join(" "),
    recommendation: details.finalRecommendation,
    details,
    dataSource: "census",
    createdAt: row.created_at.toISOString().slice(0, 10),
  };
}

function addList(doc: PDFKit.PDFDocument, items: string[]) {
  for (const item of items) {
    if (doc.y > 720) doc.addPage();
    doc.font("Helvetica").fontSize(10).fillColor("#334155").text(`- ${item}`, { indent: 12, paragraphGap: 5 });
  }
}

function addSection(doc: PDFKit.PDFDocument, title: string, body: string | string[]) {
  if (doc.y > 690) doc.addPage();
  doc.moveDown(0.9);
  doc.font("Helvetica-Bold").fontSize(14).fillColor("#102033").text(title);
  doc.moveDown(0.35);
  if (Array.isArray(body)) addList(doc, body);
  else doc.font("Helvetica").fontSize(10).fillColor("#334155").text(body, { lineGap: 3 });
}

async function renderPdf(report: Report) {
  const details = report.details || demoReport.details!;
  const doc = new PDFDocument({ size: "LETTER", margin: 48, bufferPages: true, info: { Title: `${report.businessType} - ${report.locationName}` } });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  doc.rect(0, 0, doc.page.width, 120).fill("#18324a");
  doc.fillColor("#d8cdbb").font("Helvetica-Bold").fontSize(10).text("CIVICLOOM AI MARKET REPORT", 48, 34, { characterSpacing: 1.2 });
  doc.fillColor("#ffffff").fontSize(22).text(report.businessType, 48, 54, { width: 330 });
  doc.font("Helvetica").fontSize(11).fillColor("#f1eee8").text(`${report.locationName} - ${report.radius} mile radius`, 48, 88);
  doc.roundedRect(430, 34, 110, 62, 12).fill("#285f8f");
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(28).text(String(report.opportunityScore), 450, 44, { width: 70, align: "center" });
  doc.font("Helvetica").fontSize(9).text("/100 score", 450, 75, { width: 70, align: "center" });

  doc.y = 150;
  addSection(doc, "Executive summary", details.executiveSummary);

  const metricsTop = doc.y + 16;
  [
    ["Population", fmt(report.metrics.population)],
    ["Median income", money(report.metrics.medianIncome)],
    ["Median age", `${report.metrics.medianAge.toFixed(1)} years`],
    ["Employment", pct(report.metrics.employedPct)],
  ].forEach(([label, value], index) => {
    const x = 48 + index * 126;
    doc.roundedRect(x, metricsTop, 112, 54, 8).strokeColor("#ded8cb").stroke();
    doc.fillColor("#64748b").font("Helvetica").fontSize(8).text(label, x + 10, metricsTop + 10, { width: 92 });
    doc.fillColor("#102033").font("Helvetica-Bold").fontSize(13).text(value, x + 10, metricsTop + 25, { width: 92 });
  });
  doc.y = metricsTop + 72;

  const breakdown = report.scoreBreakdown || calculateScoreBreakdown(report.metrics, report.businessType, report.targetCustomer);
  addSection(
    doc,
    "Score breakdown",
    `Demand ${breakdown.demand}/100 | Income fit ${breakdown.incomeFit}/100 | Customer fit ${breakdown.customerFit}/100 | Risk buffer ${breakdown.risk}/100 | Relevance ${breakdown.relevance}/100`,
  );
  addSection(doc, "Why this location works", details.whyThisLocationWorks);
  addSection(doc, "Risk factors", details.risks);
  addSection(doc, "Ideal customer", details.idealCustomer);
  addSection(doc, "Marketing angle", details.marketingAngle);
  addSection(doc, "Suggested next steps", details.suggestedNextSteps);
  addSection(doc, "Final recommendation", details.finalRecommendation);
  addSection(
    doc,
    "Market composition",
    `Housing units: ${fmt(report.metrics.housingUnits)} | Households: ${fmt(report.metrics.households)} | Owner occupied: ${pct(report.metrics.ownerPct)} | Renter occupied: ${pct(report.metrics.renterPct)} | Bachelor degree: ${pct(report.metrics.bachelorPct)} | Graduate degree: ${pct(report.metrics.graduatePct)} | Median rent: ${report.metrics.medianGrossRent ? money(report.metrics.medianGrossRent) : "N/A"} | Work from home: ${pct(report.metrics.commuteWorkFromHomePct)}`,
  );

  const pages = doc.bufferedPageRange();
  for (let i = pages.start; i < pages.start + pages.count; i++) {
    doc.switchToPage(i);
    doc.font("Helvetica").fontSize(8).fillColor("#94a3b8").text(`CivicLoom AI - ${report.createdAt} - Page ${i + 1}`, 48, 748, {
      width: 500,
      align: "center",
    });
  }

  doc.end();
  return done;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await loadReport(id);
  if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });

  const pdf = await renderPdf(report);
  const filename = `${report.businessType}-${report.locationName}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename || "civicloom-report"}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
