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

const stateCodes: Record<string, string> = {
  ALABAMA: "01",
  AL: "01",
  ALASKA: "02",
  AK: "02",
  ARIZONA: "04",
  AZ: "04",
  ARKANSAS: "05",
  AR: "05",
  CALIFORNIA: "06",
  CA: "06",
  COLORADO: "08",
  CO: "08",
  CONNECTICUT: "09",
  CT: "09",
  DELAWARE: "10",
  DE: "10",
  FLORIDA: "12",
  FL: "12",
  GEORGIA: "13",
  GA: "13",
  HAWAII: "15",
  HI: "15",
  IDAHO: "16",
  ID: "16",
  ILLINOIS: "17",
  IL: "17",
  INDIANA: "18",
  IN: "18",
  IOWA: "19",
  IA: "19",
  KANSAS: "20",
  KS: "20",
  KENTUCKY: "21",
  KY: "21",
  LOUISIANA: "22",
  LA: "22",
  MAINE: "23",
  ME: "23",
  MARYLAND: "24",
  MD: "24",
  MASSACHUSETTS: "25",
  MA: "25",
  MICHIGAN: "26",
  MI: "26",
  MINNESOTA: "27",
  MN: "27",
  MISSISSIPPI: "28",
  MS: "28",
  MISSOURI: "29",
  MO: "29",
  MONTANA: "30",
  MT: "30",
  NEBRASKA: "31",
  NE: "31",
  NEVADA: "32",
  NV: "32",
  "NEW HAMPSHIRE": "33",
  NH: "33",
  "NEW JERSEY": "34",
  NJ: "34",
  "NEW MEXICO": "35",
  NM: "35",
  "NEW YORK": "36",
  NY: "36",
  "NORTH CAROLINA": "37",
  NC: "37",
  "NORTH DAKOTA": "38",
  ND: "38",
  OHIO: "39",
  OH: "39",
  OKLAHOMA: "40",
  OK: "40",
  OREGON: "41",
  OR: "41",
  PENNSYLVANIA: "42",
  PA: "42",
  "RHODE ISLAND": "44",
  RI: "44",
  "SOUTH CAROLINA": "45",
  SC: "45",
  "SOUTH DAKOTA": "46",
  SD: "46",
  TENNESSEE: "47",
  TN: "47",
  TEXAS: "48",
  TX: "48",
  UTAH: "49",
  UT: "49",
  VERMONT: "50",
  VT: "50",
  VIRGINIA: "51",
  VA: "51",
  WASHINGTON: "53",
  WA: "53",
  "WEST VIRGINIA": "54",
  WV: "54",
  WISCONSIN: "55",
  WI: "55",
  WYOMING: "56",
  WY: "56",
};

export type CensusGeography = {
  state: string;
  county?: string;
  place?: string;
  name?: string;
};

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/\b(city|town|village|cdp|county|municipality|borough|balance)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function lookupNamedGeography(location: string): Promise<CensusGeography | null> {
  const [rawName, rawState] = location.split(",").map((part) => part.trim());
  const state = stateCodes[rawState?.toUpperCase()] || stateCodes[rawState];
  if (!rawName || !state) return null;

  const key = process.env.CENSUS_API_KEY ? `&key=${process.env.CENSUS_API_KEY}` : "";
  const target = normalizeName(rawName);

  for (const geographyType of ["place", "county"] as const) {
    const response = await fetch(`https://api.census.gov/data/2023/acs/acs5?get=NAME&for=${geographyType}:*&in=state:${state}${key}`, {
      next: { revalidate: 86400 },
    });
    if (!response.ok) continue;

    const [, ...rows] = await response.json();
    const match = rows.find((row: string[]) => normalizeName(row[0].split(",")[0]) === target);
    if (match) {
      return geographyType === "place"
        ? { state, place: match[2], name: match[0] }
        : { state, county: match[2], name: match[0] };
    }
  }

  return null;
}

export async function resolveLocationGeography(location: string): Promise<CensusGeography | null> {
  try {
    const named = await lookupNamedGeography(location);
    if (named) return named;

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
