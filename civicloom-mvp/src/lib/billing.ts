import Stripe from "stripe";
import { getDbPool } from "@/lib/db";
import type { AuthUser } from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";

export type PlanName = "free" | "starter" | "pro" | "agency";

export type PlanConfig = {
  name: PlanName;
  label: string;
  reportLimit: number;
  priceEnv?: string;
};

export type BillingStatus = {
  plan: PlanName;
  label: string;
  status: string;
  reportLimit: number;
  reportsUsed: number;
  reportsRemaining: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  stripeCustomerId?: string | null;
};

export const planConfigs: Record<PlanName, PlanConfig> = {
  free: { name: "free", label: "Free", reportLimit: 1 },
  starter: { name: "starter", label: "Starter", reportLimit: 5, priceEnv: "STRIPE_STARTER_PRICE_ID" },
  pro: { name: "pro", label: "Pro", reportLimit: 20, priceEnv: "STRIPE_PRO_PRICE_ID" },
  agency: { name: "agency", label: "Agency", reportLimit: 100, priceEnv: "STRIPE_AGENCY_PRICE_ID" },
};

export function normalizePlan(plan: unknown): PlanName {
  const value = String(plan || "").toLowerCase();
  return value === "starter" || value === "pro" || value === "agency" ? value : "free";
}

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export function getPriceId(plan: PlanName) {
  const envName = planConfigs[plan].priceEnv;
  return envName ? process.env[envName] : undefined;
}

export function getCurrentBillingPeriod(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

function toIsoDate(value: Date | string) {
  return new Date(value).toISOString();
}

async function addColumnIfMissing(table: string, column: string, definition: string) {
  const db = getDbPool();
  if (!db) return;

  try {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch (error) {
    const err = error as { code?: string };
    if (err.code !== "ER_DUP_FIELDNAME") throw error;
  }
}

async function addIndexIfMissing(sql: string) {
  const db = getDbPool();
  if (!db) return;

  try {
    await db.execute(sql);
  } catch (error) {
    const err = error as { code?: string };
    if (err.code !== "ER_DUP_KEYNAME") throw error;
  }
}

export async function ensureBillingSchema() {
  const db = getDbPool();
  if (!db) return false;

  await addColumnIfMissing("users", "stripe_customer_id", "VARCHAR(255) NULL");
  await addColumnIfMissing("reports", "report_json", "JSON NULL");
  await addColumnIfMissing("ai_summaries", "structured_json", "JSON NULL");
  await addIndexIfMissing("ALTER TABLE users ADD UNIQUE INDEX users_stripe_customer_id_key (stripe_customer_id)");

  await db.execute(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      stripe_subscription_id VARCHAR(255) UNIQUE,
      stripe_price_id VARCHAR(255),
      plan VARCHAR(64) NOT NULL DEFAULT 'free',
      status VARCHAR(64) NOT NULL DEFAULT 'inactive',
      report_limit INT NOT NULL DEFAULT 1,
      current_period_start DATETIME NULL,
      current_period_end DATETIME NULL,
      cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX subscriptions_user_id_idx (user_id),
      CONSTRAINT fk_subscriptions_user_runtime FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS usage_events (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(64),
      report_id VARCHAR(64),
      event_type VARCHAR(80) NOT NULL,
      plan VARCHAR(64),
      metadata JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX usage_events_user_id_created_at_idx (user_id, created_at),
      INDEX usage_events_report_id_idx (report_id),
      CONSTRAINT fk_usage_events_user_runtime FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      CONSTRAINT fk_usage_events_report_runtime FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE SET NULL
    )
  `);

  return true;
}

export async function getUserStripeCustomerId(userId: string) {
  const prisma = getPrismaClient();
  if (!prisma) return null;
  await ensureBillingSchema();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });
  return user?.stripeCustomerId || null;
}

export async function setUserStripeCustomerId(userId: string, customerId: string) {
  const prisma = getPrismaClient();
  if (!prisma) return;
  await ensureBillingSchema();
  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customerId },
  });
}

export async function getOrCreateStripeCustomer(user: AuthUser) {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe is not configured.");

  const existing = await getUserStripeCustomerId(user.id);
  if (existing) return existing;

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name || undefined,
    metadata: { userId: user.id },
  });
  await setUserStripeCustomerId(user.id, customer.id);
  return customer.id;
}

export async function getBillingStatus(userId?: string | null): Promise<BillingStatus> {
  const { start, end } = getCurrentBillingPeriod();
  const fallback: BillingStatus = {
    plan: "free",
    label: planConfigs.free.label,
    status: "inactive",
    reportLimit: planConfigs.free.reportLimit,
    reportsUsed: 0,
    reportsRemaining: planConfigs.free.reportLimit,
    currentPeriodStart: start.toISOString(),
    currentPeriodEnd: end.toISOString(),
  };
  const prisma = getPrismaClient();
  if (!prisma || !userId) return fallback;
  await ensureBillingSchema();

  const subscription = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: {
      plan: true,
      status: true,
      reportLimit: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
    },
  });
  const plan = normalizePlan(subscription?.plan);
  const active = subscription && ["active", "trialing"].includes(String(subscription.status || ""));
  const config = active ? planConfigs[plan] : planConfigs.free;
  const periodStart = subscription?.currentPeriodStart ? new Date(subscription.currentPeriodStart) : start;
  const periodEnd = subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : end;

  const reportsUsed = await prisma.usageEvent.count({
    where: {
      userId,
      eventType: "report_generated",
      createdAt: {
        gte: periodStart,
        lt: periodEnd,
      },
    },
  });
  const reportLimit = subscription?.reportLimit || config.reportLimit;
  const customerId = await getUserStripeCustomerId(userId);

  return {
    plan: active ? config.name : "free",
    label: active ? config.label : planConfigs.free.label,
    status: active ? String(subscription.status) : "inactive",
    reportLimit,
    reportsUsed,
    reportsRemaining: Math.max(reportLimit - reportsUsed, 0),
    currentPeriodStart: toIsoDate(periodStart),
    currentPeriodEnd: toIsoDate(periodEnd),
    stripeCustomerId: customerId,
  };
}

export async function assertCanGenerateReport(userId?: string | null) {
  const billing = await getBillingStatus(userId);
  const allowed = !userId || billing.reportsUsed < billing.reportLimit;

  return {
    allowed,
    billing,
    error: allowed
      ? null
      : `You have used ${billing.reportsUsed} of ${billing.reportLimit} reports for this billing period. Upgrade your plan to generate more reports.`,
  };
}

export async function recordUsageEvent(input: { userId?: string | null; reportId?: string | null; eventType: string; plan?: PlanName; metadata?: unknown }) {
  const prisma = getPrismaClient();
  if (!prisma || !input.userId) return;
  await ensureBillingSchema();

  await prisma.usageEvent.create({
    data: {
      userId: input.userId,
      reportId: input.reportId || null,
      eventType: input.eventType,
      plan: input.plan || null,
      metadata: input.metadata === undefined ? undefined : (input.metadata as never),
    },
  });
}

export async function upsertSubscriptionFromStripe(subscription: Stripe.Subscription) {
  const prisma = getPrismaClient();
  if (!prisma) return;
  await ensureBillingSchema();

  const userId = String(subscription.metadata?.userId || "");
  if (!userId) return;

  const item = subscription.items.data[0];
  const priceId = item?.price.id || null;
  const plan = normalizePlan(subscription.metadata?.plan);
  const config = planConfigs[plan];
  const periodSource = subscription as Stripe.Subscription & {
    current_period_start?: number;
    current_period_end?: number;
  };
  const itemPeriodSource = item as typeof item & {
    current_period_start?: number;
    current_period_end?: number;
  };
  const periodStart = periodSource.current_period_start || itemPeriodSource?.current_period_start || Math.floor(Date.now() / 1000);
  const periodEnd = periodSource.current_period_end || itemPeriodSource?.current_period_end || Math.floor(getCurrentBillingPeriod().end.getTime() / 1000);

  await prisma.subscription.upsert({
    where: { id: subscription.id },
    create: {
      id: subscription.id,
      userId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      plan,
      status: subscription.status,
      reportLimit: config.reportLimit,
      currentPeriodStart: new Date(periodStart * 1000),
      currentPeriodEnd: new Date(periodEnd * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    update: {
      stripePriceId: priceId,
      plan,
      status: subscription.status,
      reportLimit: config.reportLimit,
      currentPeriodStart: new Date(periodStart * 1000),
      currentPeriodEnd: new Date(periodEnd * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });
}
