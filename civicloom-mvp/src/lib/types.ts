export type CensusMetrics = {
  population: number;
  medianIncome: number;
  medianAge: number;
  employedPct: number;
  housingUnits: number;
  ownerPct: number;
  renterPct: number;
  bachelorPct: number;
  graduatePct: number;
  commuteDrivePct: number;
  commuteTransitPct: number;
  commuteWalkPct: number;
  commuteWorkFromHomePct: number;
  households: number;
  medianGrossRent: number;
};

export type ScoreBreakdown = {
  demand: number;
  incomeFit: number;
  customerFit: number;
  risk: number;
  relevance: number;
};

export type ReportDetails = {
  executiveSummary: string;
  whyThisLocationWorks: string[];
  risks: string[];
  idealCustomer: string;
  marketingAngle: string;
  suggestedNextSteps: string[];
  finalRecommendation: string;
  demandDrivers: string[];
};

export type Report = {
  id: string;
  businessType: string;
  locationName: string;
  geographyType: "place" | "county";
  stateCode?: string;
  countyCode?: string;
  placeCode?: string;
  radius: number;
  targetCustomer: string;
  reportType: string;
  opportunityScore: number;
  scoreBreakdown?: ScoreBreakdown;
  metrics: CensusMetrics;
  aiSummary: string;
  riskSummary: string;
  recommendation: string;
  details?: ReportDetails;
  dataSource?: "census" | "demo";
  createdAt: string;
};
