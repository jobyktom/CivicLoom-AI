import { NextResponse } from "next/server";
import { getDatabaseErrorMessage, getDbConfigMode, getDbPool } from "@/lib/db";
import { getPrismaClient } from "@/lib/prisma";

const REQUIRED_AUTH_TABLES = ["users", "accounts", "sessions", "verification_tokens"] as const;
const REQUIRED_USER_COLUMNS = ["id", "email", "name", "password_hash", "email_verified", "image"] as const;

export async function GET() {
  const db = getDbPool();
  const configMode = getDbConfigMode();

  if (!db) {
    return NextResponse.json(
      {
        ok: false,
        configMode,
        error: "No database environment variables found. Add DATABASE_URL or DB_* variables.",
      },
      { status: 503 },
    );
  }

  try {
    await db.query("SELECT 1");
    const [tables] = await db.query("SHOW TABLES LIKE 'reports'");
    const hasReportsTable = Array.isArray(tables) && tables.length > 0;
    const authTables = Object.fromEntries(
      await Promise.all(
        REQUIRED_AUTH_TABLES.map(async (table) => {
          const [matches] = await db.query("SHOW TABLES LIKE ?", [table]);
          return [table, Array.isArray(matches) && matches.length > 0];
        }),
      ),
    ) as Record<(typeof REQUIRED_AUTH_TABLES)[number], boolean>;
    const [userColumnsResult] = await db.query("SHOW COLUMNS FROM users");
    const userColumns = Array.isArray(userColumnsResult)
      ? userColumnsResult
          .map((column) => {
            if (!column || typeof column !== "object" || !("Field" in column)) return null;
            return String(column.Field);
          })
          .filter(Boolean)
      : [];
    const authUserColumns = Object.fromEntries(
      REQUIRED_USER_COLUMNS.map((column) => [column, userColumns.includes(column)]),
    ) as Record<(typeof REQUIRED_USER_COLUMNS)[number], boolean>;
    const hasAuthTables = Object.values(authTables).every(Boolean);
    const hasAuthUserColumns = Object.values(authUserColumns).every(Boolean);
    const prisma = getPrismaClient();
    const prismaReportCount = prisma && hasReportsTable ? Number((await prisma.$queryRaw`SELECT COUNT(*) AS count FROM reports` as { count: bigint }[])[0]?.count || 0) : null;

    return NextResponse.json({
      ok: hasReportsTable && hasAuthTables && hasAuthUserColumns,
      configMode,
      connected: true,
      hasReportsTable,
      hasAuthTables,
      authTables,
      hasAuthUserColumns,
      authUserColumns,
      authConfig: {
        googleProviderConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        authSecretConfigured: Boolean(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET),
        prismaAdapterEnabled: process.env.AUTH_PRISMA_ADAPTER === "true",
      },
      prismaConnected: prismaReportCount !== null,
      prismaReportCount,
      message:
        hasReportsTable && hasAuthTables && hasAuthUserColumns
          ? "Connected to Hostinger MySQL. Reports and Auth.js tables exist, and Prisma can read the reports table."
          : "Connected to Hostinger MySQL, but one or more required tables or auth columns are missing. Run the Hostinger schema and phase 3 auth SQL files.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        configMode,
        connected: false,
        error: getDatabaseErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
