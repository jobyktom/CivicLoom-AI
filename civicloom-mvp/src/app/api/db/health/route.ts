import { NextResponse } from "next/server";
import { getDatabaseErrorMessage, getDbConfigMode, getDbPool } from "@/lib/db";
import { getPrismaClient } from "@/lib/prisma";

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
    const prisma = getPrismaClient();
    const prismaReportCount = prisma && hasReportsTable ? Number((await prisma.$queryRaw`SELECT COUNT(*) AS count FROM reports` as { count: bigint }[])[0]?.count || 0) : null;

    return NextResponse.json({
      ok: hasReportsTable,
      configMode,
      connected: true,
      hasReportsTable,
      prismaConnected: prismaReportCount !== null,
      prismaReportCount,
      message: hasReportsTable
        ? "Connected to Hostinger MySQL and reports table exists. Prisma can read the reports table."
        : "Connected to Hostinger MySQL, but reports table is missing. Run hostinger/schema.sql.",
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
