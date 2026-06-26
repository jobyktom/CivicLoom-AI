import { NextResponse } from "next/server";
import { getDatabaseErrorMessage, getDbConfigMode, getDbPool } from "@/lib/db";

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

    return NextResponse.json({
      ok: hasReportsTable,
      configMode,
      connected: true,
      hasReportsTable,
      message: hasReportsTable
        ? "Connected to Hostinger MySQL and reports table exists."
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

