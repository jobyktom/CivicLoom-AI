import { getDbPool } from "@/lib/db";
import type { AuthUser } from "@/lib/auth";

export type BusinessTemplate = {
  id: string;
  slug: string;
  name: string;
  description: string;
  assumptions: {
    targetCustomer: string;
    radius: number;
    reportType: string;
    riskSignals: string[];
  };
};

export type WatchlistLocation = {
  id: string;
  businessType: string;
  locationName: string;
  geographyType: string;
  stateCode?: string | null;
  countyCode?: string | null;
  placeCode?: string | null;
  lastScore?: number | null;
  lastCheckedAt?: string | null;
  createdAt: string;
};

export const defaultBusinessTemplates: BusinessTemplate[] = [
  {
    id: "tmpl_coffee_shop",
    slug: "coffee-shop",
    name: "Coffee shop",
    description: "Best for cafes, bakeries, and morning-routine businesses.",
    assumptions: {
      targetCustomer: "Young professionals",
      radius: 3,
      reportType: "Market opportunity",
      riskSignals: ["high rent", "dense competition", "weak morning traffic"],
    },
  },
  {
    id: "tmpl_daycare",
    slug: "daycare",
    name: "Daycare",
    description: "Best for childcare concepts that depend on working families and household density.",
    assumptions: {
      targetCustomer: "Working parents",
      radius: 5,
      reportType: "Audience profile",
      riskSignals: ["licensing complexity", "low household density", "commute mismatch"],
    },
  },
  {
    id: "tmpl_fitness_studio",
    slug: "fitness-studio",
    name: "Fitness studio",
    description: "Best for boutique gyms, Pilates, yoga, wellness, and membership concepts.",
    assumptions: {
      targetCustomer: "Health-conscious adults",
      radius: 5,
      reportType: "Market opportunity",
      riskSignals: ["membership churn", "parking constraints", "crowded category"],
    },
  },
];

type TemplateRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  assumptions: string | object | null;
};

type WatchlistRow = {
  id: string;
  business_type: string;
  location_name: string;
  geography_type: string;
  state_code: string | null;
  county_code: string | null;
  place_code: string | null;
  last_score: number | null;
  last_checked_at: Date | null;
  created_at: Date;
};

function parseAssumptions(value: unknown, fallback: BusinessTemplate["assumptions"]) {
  if (!value) return fallback;
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return {
      targetCustomer: String(parsed.targetCustomer || parsed.idealCustomers?.[0] || fallback.targetCustomer),
      radius: Number(parsed.radius || fallback.radius),
      reportType: String(parsed.reportType || fallback.reportType),
      riskSignals: Array.isArray(parsed.riskSignals) ? parsed.riskSignals.map(String) : fallback.riskSignals,
    };
  } catch {
    return fallback;
  }
}

export async function ensureValueAddSchema() {
  const db = getDbPool();
  if (!db) return false;

  await db.execute(`
    CREATE TABLE IF NOT EXISTS business_templates (
      id VARCHAR(64) PRIMARY KEY,
      slug VARCHAR(120) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      demand_weight INT NOT NULL DEFAULT 35,
      income_weight INT NOT NULL DEFAULT 25,
      customer_fit_weight INT NOT NULL DEFAULT 25,
      risk_weight INT NOT NULL DEFAULT 15,
      assumptions JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS watchlist_locations (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      business_type VARCHAR(255) NOT NULL,
      location_name VARCHAR(255) NOT NULL,
      geography_type VARCHAR(32) NOT NULL DEFAULT 'county',
      state_code VARCHAR(8),
      county_code VARCHAR(8),
      place_code VARCHAR(16),
      last_score INT,
      last_checked_at DATETIME,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX watchlist_locations_user_id_created_at_idx (user_id, created_at),
      CONSTRAINT fk_watchlist_locations_user_runtime FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  for (const template of defaultBusinessTemplates) {
    await db.execute(
      `INSERT IGNORE INTO business_templates
        (id,slug,name,description,assumptions)
       VALUES (?,?,?,?,?)`,
      [template.id, template.slug, template.name, template.description, JSON.stringify(template.assumptions)],
    );
  }

  return true;
}

export async function listBusinessTemplates(): Promise<{ templates: BusinessTemplate[]; source: "mysql" | "demo" }> {
  const db = getDbPool();
  if (!db) return { templates: defaultBusinessTemplates, source: "demo" };
  await ensureValueAddSchema();

  const [rows] = await db.query("SELECT id,slug,name,description,assumptions FROM business_templates ORDER BY name ASC");
  const templates = (rows as TemplateRow[]).map((row) => {
    const fallback = defaultBusinessTemplates.find((template) => template.id === row.id)?.assumptions || defaultBusinessTemplates[0].assumptions;
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description || "",
      assumptions: parseAssumptions(row.assumptions, fallback),
    };
  });

  return { templates: templates.length ? templates : defaultBusinessTemplates, source: templates.length ? "mysql" : "demo" };
}

export async function listWatchlist(user?: AuthUser | null): Promise<WatchlistLocation[]> {
  const db = getDbPool();
  if (!db || !user) return [];
  await ensureValueAddSchema();

  const [rows] = await db.query(
    "SELECT id,business_type,location_name,geography_type,state_code,county_code,place_code,last_score,last_checked_at,created_at FROM watchlist_locations WHERE user_id = ? ORDER BY created_at DESC LIMIT 25",
    [user.id],
  );

  return (rows as WatchlistRow[]).map((row) => ({
    id: row.id,
    businessType: row.business_type,
    locationName: row.location_name,
    geographyType: row.geography_type,
    stateCode: row.state_code,
    countyCode: row.county_code,
    placeCode: row.place_code,
    lastScore: row.last_score,
    lastCheckedAt: row.last_checked_at?.toISOString() || null,
    createdAt: row.created_at.toISOString(),
  }));
}

export async function addWatchlistLocation(user: AuthUser, input: { businessType: string; locationName: string; geographyType?: string; stateCode?: string | null; countyCode?: string | null; placeCode?: string | null; lastScore?: number | null }) {
  const db = getDbPool();
  if (!db) throw new Error("Database is not configured.");
  await ensureValueAddSchema();

  const id = crypto.randomUUID();
  await db.execute(
    "INSERT INTO watchlist_locations (id,user_id,business_type,location_name,geography_type,state_code,county_code,place_code,last_score,last_checked_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
    [
      id,
      user.id,
      input.businessType,
      input.locationName,
      input.geographyType || "county",
      input.stateCode || null,
      input.countyCode || null,
      input.placeCode || null,
      input.lastScore || null,
      input.lastScore ? new Date() : null,
    ],
  );

  return id;
}

export async function removeWatchlistLocation(user: AuthUser, id: string) {
  const db = getDbPool();
  if (!db) throw new Error("Database is not configured.");
  await ensureValueAddSchema();
  await db.execute("DELETE FROM watchlist_locations WHERE id = ? AND user_id = ?", [id, user.id]);
}
