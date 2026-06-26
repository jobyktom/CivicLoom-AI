import OpenAI from "openai";
import { Report, ReportDetails } from "./types";

let openai: OpenAI | null = null;

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai;
}

function fallbackDetails(report: Report): ReportDetails {
  const income = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(report.metrics.medianIncome);

  return {
    executiveSummary: `${report.locationName} shows a ${report.opportunityScore}/100 opportunity score for ${report.businessType}. The market has ${report.metrics.population.toLocaleString()} residents, median household income around ${income}, and an employment rate near ${Math.round(report.metrics.employedPct)}%.`,
    whyThisLocationWorks: [
      `The local population base creates enough day-to-day demand to test a focused ${report.businessType} concept.`,
      `Median household income of ${income} supports a clear pricing strategy for ${report.targetCustomer}.`,
      `Housing and commute patterns suggest where to prioritize visibility, convenience, and repeat visits.`,
    ],
    risks: [
      "Census data does not show competitor density, rent terms, or exact foot traffic.",
      "County-level data can hide block-by-block differences, so site selection still matters.",
      "The concept needs validation with lease pricing, traffic counts, and competitor mapping.",
    ],
    idealCustomer: report.targetCustomer,
    marketingAngle: `Position the business as the most convenient, locally aware option for ${report.targetCustomer.toLowerCase()}.`,
    suggestedNextSteps: [
      "Compare two to three nearby trade areas before choosing a site.",
      "Check competitor concentration and Google Maps review gaps.",
      "Validate rent, parking, signage, and morning/evening traffic before signing a lease.",
    ],
    finalRecommendation: report.recommendation,
    demandDrivers: ["Population scale", "Income fit", "Employment stability", "Target customer alignment"],
  };
}

function coerceDetails(value: unknown, report: Report): ReportDetails {
  const fallback = fallbackDetails(report);
  if (!value || typeof value !== "object") return fallback;
  const parsed = value as Partial<ReportDetails>;
  const asArray = (input: unknown, backup: string[]) => (Array.isArray(input) ? input.map(String).filter(Boolean).slice(0, 6) : backup);

  return {
    executiveSummary: String(parsed.executiveSummary || fallback.executiveSummary),
    whyThisLocationWorks: asArray(parsed.whyThisLocationWorks, fallback.whyThisLocationWorks),
    risks: asArray(parsed.risks, fallback.risks),
    idealCustomer: String(parsed.idealCustomer || fallback.idealCustomer),
    marketingAngle: String(parsed.marketingAngle || fallback.marketingAngle),
    suggestedNextSteps: asArray(parsed.suggestedNextSteps, fallback.suggestedNextSteps),
    finalRecommendation: String(parsed.finalRecommendation || fallback.finalRecommendation),
    demandDrivers: asArray(parsed.demandDrivers, fallback.demandDrivers),
  };
}

export async function generateReportNarrative(report: Report): Promise<ReportDetails> {
  const client = getOpenAIClient();
  if (!client) return fallbackDetails(report);

  try {
    const result = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a practical local-market analyst for small business site selection. Use the provided Census metrics only. Be specific, evidence-aware, and concise. Return valid JSON only.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Create a detailed local market report.",
            requiredShape: {
              executiveSummary: "string",
              whyThisLocationWorks: ["string"],
              risks: ["string"],
              idealCustomer: "string",
              marketingAngle: "string",
              suggestedNextSteps: ["string"],
              finalRecommendation: "string",
              demandDrivers: ["string"],
            },
            report,
          }),
        },
      ],
    });

    const content = result.choices[0]?.message.content;
    return coerceDetails(content ? JSON.parse(content) : null, report);
  } catch (error) {
    console.error("AI report generation failed", error);
    return fallbackDetails(report);
  }
}

