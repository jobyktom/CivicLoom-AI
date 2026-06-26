import { CensusMetrics } from "./types";

const variables = {
  population: "B01003_001E",
  medianIncome: "B19013_001E",
  medianAge: "B01002_001E",
  housingUnits: "B25001_001E",
  households: "B25003_001E",
  owner: "B25003_002E",
  renter: "B25003_003E",
  employed: "B23025_004E",
  laborForce: "B23025_003E",
  bachelor: "B15003_022E",
  masters: "B15003_023E",
  professional: "B15003_024E",
  doctorate: "B15003_025E",
  workers16Plus: "B08301_001E",
  commuteDriveAlone: "B08301_003E",
  commuteCarpool: "B08301_004E",
  commuteTransit: "B08301_010E",
  commuteWalk: "B08301_019E",
  commuteWorkFromHome: "B08301_021E",
  medianGrossRent: "B25064_001E",
};

export type CensusGeography = {
  state: string;
  county?: string;
  place?: string;
  name?: string;
};

export async function resolveLocationGeography(location: string): Promise<CensusGeography | null> {
  try {
    const response = await fetch(
      `https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?format=json&benchmark=Public_AR_Current&vintage=Current_Current&layers=10&address=${encodeURIComponent(
        location,
      )}`,
      { next: { revalidate: 86400 } },
    );
    if (!response.ok) return null;
    const geo = await response.json();
    const match = geo.result?.addressMatches?.[0];
    const county = match?.geographies?.Counties?.[0];
    const geoid = county?.GEOID as string | undefined;

    if (!geoid || geoid.length < 5) return null;

    return {
      state: geoid.slice(0, 2),
      county: geoid.slice(2),
      name: county?.NAME,
    };
  } catch {
    return null;
  }
}

export async function getCensusMetrics({ state, place, county }: { state: string; place?: string; county?: string }): Promise<CensusMetrics | null> {
  try {
    const geo = place ? `for=place:${place}&in=state:${state}` : `for=county:${county}&in=state:${state}`;
    const key = process.env.CENSUS_API_KEY ? `&key=${process.env.CENSUS_API_KEY}` : "";
    const response = await fetch(`https://api.census.gov/data/2023/acs/acs5?get=NAME,${Object.values(variables).join(",")}&${geo}${key}`, {
      next: { revalidate: 86400 },
    });

    if (!response.ok) return null;

    const [headers, row] = await response.json();
    const data = Object.fromEntries(headers.map((h: string, i: number) => [h, row[i]]));
    const n = (v: string) => Number(data[v]) || 0;
    const households = n(variables.households);
    const workerBase = n(variables.workers16Plus);
    const graduate = n(variables.masters) + n(variables.professional) + n(variables.doctorate);
    const drive = n(variables.commuteDriveAlone) + n(variables.commuteCarpool);

    return {
      population: n(variables.population),
      medianIncome: n(variables.medianIncome),
      medianAge: n(variables.medianAge),
      housingUnits: n(variables.housingUnits),
      households,
      ownerPct: households ? (n(variables.owner) / households) * 100 : 0,
      renterPct: households ? (n(variables.renter) / households) * 100 : 0,
      employedPct: n(variables.laborForce) ? (n(variables.employed) / n(variables.laborForce)) * 100 : 0,
      bachelorPct: n(variables.population) ? (n(variables.bachelor) / n(variables.population)) * 100 : 0,
      graduatePct: n(variables.population) ? (graduate / n(variables.population)) * 100 : 0,
      commuteDrivePct: workerBase ? (drive / workerBase) * 100 : 0,
      commuteTransitPct: workerBase ? (n(variables.commuteTransit) / workerBase) * 100 : 0,
      commuteWalkPct: workerBase ? (n(variables.commuteWalk) / workerBase) * 100 : 0,
      commuteWorkFromHomePct: workerBase ? (n(variables.commuteWorkFromHome) / workerBase) * 100 : 0,
      medianGrossRent: n(variables.medianGrossRent),
    };
  } catch {
    return null;
  }
}

export { variables as censusVariables };
