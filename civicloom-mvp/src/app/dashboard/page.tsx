import Link from "next/link";
import { ArrowUpRight, FileText, Plus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getDbPool } from "@/lib/db";
import { savedReports } from "@/lib/mock-data";
import type { Report } from "@/lib/types";

export const dynamic = "force-dynamic";

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

async function getReports(userId?: string) {
  const db = getDbPool();
  if (!db) return { reports: savedReports, source: "demo" };

  const sql = userId
    ? "SELECT id,business_type,location_name,geography_type,state_code,county_code,place_code,radius,target_customer,report_type,opportunity_score,ai_summary,risk_summary,recommendation,created_at FROM reports WHERE user_id = ? ORDER BY created_at DESC LIMIT 25"
    : "SELECT id,business_type,location_name,geography_type,state_code,county_code,place_code,radius,target_customer,report_type,opportunity_score,ai_summary,risk_summary,recommendation,created_at FROM reports ORDER BY created_at DESC LIMIT 25";
  const [rows] = userId ? await db.query(sql, [userId]) : await db.query(sql);

  return {
    source: "mysql",
    reports: (rows as ReportRow[]).map(
      (row): Report => ({
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
      }),
    ),
  };
}

export default async function Dashboard() {
  const user = await getCurrentUser();
  const { reports, source } = await getReports(user?.id);

  return (
    <main className="bg-[#faf9f6] px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[.18em] text-[#285f8f]">Workspace</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#102033]">Your market reports</h1>
            <p className="mt-2 text-sm text-slate-500">
              {user
                ? `Signed in as ${user.name || user.email}. ${source === "mysql" ? "Showing reports saved to your account." : "Demo mode."}`
                : source === "mysql"
                  ? "Showing all saved reports. Sign in to save reports to your own account."
                  : "Demo mode until database variables are configured."}
            </p>
          </div>
          <div className="flex gap-3">
            {!user && (
              <Button asChild variant="outline">
                <Link href="/auth">
                  <UserRound className="mr-2" />
                  Sign in
                </Link>
              </Button>
            )}
            <Button asChild className="bg-[#18324a] text-white hover:bg-[#102033]">
              <Link href="/report/new">
                <Plus className="mr-2" />
                New report
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-[#ded8cb] bg-white">
          <div className="hidden grid-cols-[1.5fr_1fr_.7fr_.7fr] gap-4 border-b border-[#ded8cb] bg-[#f7f4ed] px-6 py-3 text-xs font-medium uppercase tracking-wide text-slate-500 sm:grid">
            <span>Report</span>
            <span>Location</span>
            <span>Score</span>
            <span>Created</span>
          </div>
          {reports.length ? (
            reports.map((report) => (
              <Link
                href={`/report/${report.id}`}
                key={report.id}
                className="grid gap-2 border-b border-[#eee8dc] px-6 py-5 last:border-0 hover:bg-[#faf9f6] sm:grid-cols-[1.5fr_1fr_.7fr_.7fr] sm:items-center sm:gap-4"
              >
                <span className="flex items-center gap-3 font-medium">
                  <FileText className="h-4 w-4 text-[#285f8f]" />
                  {report.businessType}
                </span>
                <span className="text-sm text-slate-600">{report.locationName}</span>
                <span className="font-semibold text-[#285f8f]">{report.opportunityScore}/100</span>
                <span className="flex items-center justify-between text-sm text-slate-500">
                  {report.createdAt}
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </Link>
            ))
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="font-medium text-slate-800">No reports saved to this account yet.</p>
              <p className="mt-2 text-sm text-slate-500">Create your first report and it will appear here automatically.</p>
              <Button asChild className="mt-5 bg-[#18324a] text-white hover:bg-[#102033]">
                <Link href="/report/new">Create report</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
