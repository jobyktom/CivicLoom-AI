import { CensusMetrics, ScoreBreakdown } from "./types";

const clamp = (value: number) => Math.max(0, Math.min(100, value));

export function calculateScoreBreakdown(metrics: CensusMetrics, businessType: string, targetCustomer: string): ScoreBreakdown {
  const demand = clamp(metrics.population / 1800 + metrics.households / 1200);
  const incomeFit = clamp(metrics.medianIncome / 900);
  const educationLifestyleFit = clamp(metrics.bachelorPct * 1.2 + metrics.graduatePct * 1.5 + (45 - Math.abs(metrics.medianAge - 36)));
  const renterUrbanFit = clamp(metrics.renterPct * 0.7 + metrics.commuteWalkPct * 2 + metrics.commuteTransitPct * 1.5 + metrics.commuteWorkFromHomePct);
  const customerFit = /professional|young|student|urban|fitness|premium|family/i.test(targetCustomer)
    ? clamp((educationLifestyleFit + renterUrbanFit) / 2)
    : clamp(62 + metrics.employedPct * 0.2);
  const employmentRiskBuffer = clamp(metrics.employedPct);
  const housingStability = clamp(metrics.ownerPct * 0.6 + metrics.renterPct * 0.3);
  const rentPressure = metrics.medianGrossRent ? clamp(100 - metrics.medianGrossRent / 35) : 62;
  const risk = clamp((employmentRiskBuffer + housingStability + rentPressure) / 3);
  const relevance = /coffee|cafe|fitness|restaurant|retail|salon|clinic|daycare|studio/i.test(businessType) ? 82 : 68;

  return {
    demand: Math.round(demand),
    incomeFit: Math.round(incomeFit),
    customerFit: Math.round(customerFit),
    risk: Math.round(risk),
    relevance,
  };
}

export function calculateOpportunityScore(metrics: CensusMetrics, businessType: string, targetCustomer: string) {
  const breakdown = calculateScoreBreakdown(metrics, businessType, targetCustomer);
  return Math.round(
    breakdown.demand * 0.35 +
      breakdown.incomeFit * 0.25 +
      ((breakdown.customerFit + breakdown.relevance) / 2) * 0.25 +
      breakdown.risk * 0.15,
  );
}
