import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { savedReports } from "@/lib/mock-data";
import type { Report } from "@/lib/types";

type ReportRow = {
  id: string;
  business_type: string;
  location_name: string;
  geography_type: "place" | "county";
  state_code: string | null;
  county_code: string | null;
  place_code: string | null;
  radius: number | null;
  target_customer: string | null;
  report_type: string | null;
  opportunity_score: number | null;
  ai_summary: string | null;
  risk_summary: string | null;
  recommendation: string | null;
  created_at: Date;
};

export async function GET() {
  const db = getDbPool();

  if (!db) {
    return NextResponse.json({ reports: savedReports, source: "demo" });
  }

  const [rows] = await db.query(
    "SELECT id,business_type,location_name,geography_type,state_code,county_code,place_code,radius,target_customer,report_type,opportunity_score,ai_summary,risk_summary,recommendation,created_at FROM reports ORDER BY created_at DESC LIMIT 25",
  );

  const reports: Report[] = (rows as ReportRow[]).map((row) => ({
    id: row.id,
    businessType: row.business_type,
    locationName: row.location_name,
    geographyType: row.geography_type,
    stateCode: row.state_code || undefined,
    countyCode: row.county_code || undefined,
    placeCode: row.place_code || undefined,
    radius: row.radius || 3,
    targetCustomer: row.target_customer || "Local customers",
    reportType: row.report_type || "Market opportunity",
    opportunityScore: row.opportunity_score || 0,
    metrics: savedReports[0].metrics,
    aiSummary: row.ai_summary || "",
    riskSummary: row.risk_summary || "",
    recommendation: row.recommendation || "",
    createdAt: row.created_at.toISOString().slice(0, 10),
  }));

  return NextResponse.json({ reports, source: "mysql" });
}

