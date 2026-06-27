import { getDbPool } from "@/lib/db";
import type { AuthUser } from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";

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
  const prisma = getPrismaClient();
  if (!prisma) return { templates: defaultBusinessTemplates, source: "demo" };
  await ensureValueAddSchema();

  const rows = await prisma.businessTemplate.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      assumptions: true,
    },
  });
  const templates = rows.map((row) => {
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
  const prisma = getPrismaClient();
  if (!prisma || !user) return [];
  await ensureValueAddSchema();

  const rows = await prisma.watchlistLocation.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 25,
    select: {
      id: true,
      businessType: true,
      locationName: true,
      geographyType: true,
      stateCode: true,
      countyCode: true,
      placeCode: true,
      lastScore: true,
      lastCheckedAt: true,
      createdAt: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    businessType: row.businessType,
    locationName: row.locationName,
    geographyType: row.geographyType,
    stateCode: row.stateCode,
    countyCode: row.countyCode,
    placeCode: row.placeCode,
    lastScore: row.lastScore,
    lastCheckedAt: row.lastCheckedAt?.toISOString() || null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function addWatchlistLocation(user: AuthUser, input: { businessType: string; locationName: string; geographyType?: string; stateCode?: string | null; countyCode?: string | null; placeCode?: string | null; lastScore?: number | null }) {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Database is not configured.");
  await ensureValueAddSchema();

  const id = crypto.randomUUID();
  await prisma.watchlistLocation.create({
    data: {
      id,
      userId: user.id,
      businessType: input.businessType,
      locationName: input.locationName,
      geographyType: input.geographyType || "county",
      stateCode: input.stateCode || null,
      countyCode: input.countyCode || null,
      placeCode: input.placeCode || null,
      lastScore: input.lastScore || null,
      lastCheckedAt: input.lastScore ? new Date() : null,
    },
  });

  return id;
}

export async function removeWatchlistLocation(user: AuthUser, id: string) {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Database is not configured.");
  await ensureValueAddSchema();
  await prisma.watchlistLocation.deleteMany({
    where: {
      id,
      userId: user.id,
    },
  });
}
