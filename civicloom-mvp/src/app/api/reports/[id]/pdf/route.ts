import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import { getCurrentUser } from "@/lib/auth";
import { demoReport } from "@/lib/mock-data";
import { calculateScoreBreakdown } from "@/lib/scoring";
import { loadReportById } from "@/lib/report-loader";
import type { Report } from "@/lib/types";

export const runtime = "nodejs";

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const fmt = (value: number) => new Intl.NumberFormat("en-US").format(Math.round(value));
const pct = (value: number) => `${Math.round(value)}%`;

function addList(doc: PDFKit.PDFDocument, items: string[]) {
  for (const item of items) {
    if (doc.y > 720) doc.addPage();
    doc.font("Helvetica").fontSize(10).fillColor("#334155").text(`• ${item}`, { indent: 12, paragraphGap: 5 });
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

function addScoreTable(doc: PDFKit.PDFDocument, report: Report) {
  const breakdown = report.scoreBreakdown || calculateScoreBreakdown(report.metrics, report.businessType, report.targetCustomer);
  const rows = [
    ["Demand", "35%", `${breakdown.demand}/100`, "Population scale and local demand base"],
    ["Income fit", "25%", `${breakdown.incomeFit}/100`, "Median income and affordability alignment"],
    ["Customer fit", "25%", `${breakdown.customerFit}/100`, "Target-customer and concept fit"],
    ["Risk buffer", "15%", `${breakdown.risk}/100`, "Basic market risk and density pressure"],
  ];

  addSection(doc, "Transparent score model", "CivicLoom uses a weighted score so the recommendation can be audited instead of treated like a black box.");
  doc.moveDown(0.2);
  for (const [label, weight, score, note] of rows) {
    if (doc.y > 720) doc.addPage();
    const rowTop = doc.y;
    doc.roundedRect(48, rowTop, 500, 32, 6).strokeColor("#ded8cb").stroke();
    doc.fillColor("#102033").font("Helvetica-Bold").fontSize(9).text(label, 58, rowTop + 9, { width: 90 });
    doc.fillColor("#64748b").font("Helvetica").fontSize(8).text(weight, 150, rowTop + 10, { width: 44 });
    doc.fillColor("#285f8f").font("Helvetica-Bold").fontSize(9).text(score, 202, rowTop + 9, { width: 60 });
    doc.fillColor("#334155").font("Helvetica").fontSize(8).text(note, 274, rowTop + 9, { width: 250 });
    doc.y = rowTop + 38;
  }
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
  doc.font("Helvetica").fontSize(11).fillColor("#f1eee8").text(`${report.locationName} · ${report.radius} mile radius`, 48, 88);
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

  addScoreTable(doc, report);
  if (details.demandAnalysis) addSection(doc, "Demand analysis", details.demandAnalysis);
  if (details.incomeFit) addSection(doc, "Income fit", details.incomeFit);
  if (details.housingInsight) addSection(doc, "Housing insight", details.housingInsight);
  if (details.employmentInsight) addSection(doc, "Employment insight", details.employmentInsight);
  addSection(doc, "Demand drivers", details.demandDrivers);
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
  addSection(
    doc,
    "Data notes",
    `Source: ${report.dataSource === "census" ? "ACS/Census-backed metrics where available" : "Demo fallback data"}. Geography: ${report.geographyType}. Search radius: ${report.radius} miles. Generated: ${report.createdAt}.`,
  );

  const pages = doc.bufferedPageRange();
  for (let i = pages.start; i < pages.start + pages.count; i++) {
    doc.switchToPage(i);
    doc.font("Helvetica").fontSize(8).fillColor("#94a3b8").text(`CivicLoom AI · ${report.createdAt} · Page ${i + 1}`, 48, 748, {
      width: 500,
      align: "center",
    });
  }

  doc.end();
  return done;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to download this report." }, { status: 401 });

  const report = await loadReportById(id, user.id);
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
