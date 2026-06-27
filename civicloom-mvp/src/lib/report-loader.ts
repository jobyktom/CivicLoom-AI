import { ensureBillingSchema } from "@/lib/billing";
import { demoReport } from "@/lib/mock-data";
import { getPrismaClient } from "@/lib/prisma";
import { calculateScoreBreakdown } from "@/lib/scoring";
import type { CensusMetrics, Report, ReportDetails, ScoreBreakdown } from "@/lib/types";

type ReportRecord = NonNullable<Awaited<ReturnType<typeof fetchReportRecord>>>;
type AiRecord = ReportRecord["aiSummaries"][number] | undefined;

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

function legacyDetails(row: ReportRecord, ai: AiRecord): ReportDetails {
  const recommendationPayload = parseRecommendation(ai?.recommendation || null);
  return {
    executiveSummary: ai?.executiveSummary || row.aiSummary || demoReport.details?.executiveSummary || demoReport.aiSummary,
    whyThisLocationWorks: Array.isArray(recommendationPayload.whyThisLocationWorks)
      ? recommendationPayload.whyThisLocationWorks.map(String)
      : demoReport.details?.whyThisLocationWorks || [],
    risks: parseArray(ai?.risks || row.riskSummary, demoReport.details?.risks || []),
    idealCustomer: ai?.idealCustomer || row.targetCustomer || demoReport.details?.idealCustomer || "Local customers",
    marketingAngle: ai?.marketingAngle || demoReport.details?.marketingAngle || "",
    suggestedNextSteps: Array.isArray(recommendationPayload.suggestedNextSteps)
      ? recommendationPayload.suggestedNextSteps.map(String)
      : demoReport.details?.suggestedNextSteps || [],
    finalRecommendation: recommendationPayload.finalRecommendation || row.recommendation || demoReport.recommendation,
    demandDrivers: Array.isArray(recommendationPayload.demandDrivers)
      ? recommendationPayload.demandDrivers.map(String)
      : demoReport.details?.demandDrivers || [],
  };
}

async function fetchReportRecord(id: string, ownerUserId?: string | null) {
  const prisma = getPrismaClient();
  if (!prisma) return null;

  return prisma.report.findFirst({
    where: {
      id,
      ...(ownerUserId ? { userId: ownerUserId } : {}),
    },
    include: {
      censusMetrics: {
        select: {
          metricName: true,
          metricValue: true,
        },
      },
      aiSummaries: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          executiveSummary: true,
          risks: true,
          idealCustomer: true,
          marketingAngle: true,
          recommendation: true,
          structuredJson: true,
        },
      },
    },
  });
}

export async function loadReportById(id: string, ownerUserId?: string | null): Promise<Report | null> {
  const prisma = getPrismaClient();
  if (!prisma) return { ...demoReport, id };

  await ensureBillingSchema();

  const row = await fetchReportRecord(id, ownerUserId);
  if (!row) return null;

  const metrics = { ...demoReport.metrics };
  for (const metric of row.censusMetrics) {
    if (metric.metricValue !== null) metrics[metric.metricName as keyof CensusMetrics] = Number(metric.metricValue);
  }

  const ai = row.aiSummaries[0];
  const stored = parseJsonObject<StoredReportJson>(row.reportJson);
  const storedAi = parseJsonObject<{ details?: Partial<ReportDetails> }>(ai?.structuredJson);
  const fallbackDetails = legacyDetails(row, ai);
  const details = coerceDetails(stored.details || storedAi.details || {}, fallbackDetails);
  const scoreBreakdown = stored.scoreBreakdown || calculateScoreBreakdown(metrics, row.businessType, row.targetCustomer || "Local customers");

  return {
    id: row.id,
    businessType: row.businessType,
    locationName: row.locationName,
    geographyType: row.geographyType as "place" | "county",
    stateCode: row.stateCode || undefined,
    countyCode: row.countyCode || undefined,
    placeCode: row.placeCode || undefined,
    radius: row.radius || 3,
    targetCustomer: row.targetCustomer || "Local customers",
    reportType: row.reportType || "Market opportunity",
    opportunityScore: row.opportunityScore || 0,
    scoreBreakdown,
    metrics,
    aiSummary: details.executiveSummary,
    riskSummary: details.risks.join(" "),
    recommendation: details.finalRecommendation,
    details,
    dataSource: stored.dataSource || "census",
    createdAt: row.createdAt.toISOString().slice(0, 10),
  };
}
