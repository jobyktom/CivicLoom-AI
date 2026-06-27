import { getDbPool } from "@/lib/db";
import { savedReports } from "@/lib/mock-data";
import { loadReportById } from "@/lib/report-loader";
import type { Report } from "@/lib/types";

type IdRow = { id: string };

export async function listSavedReports(userId?: string | null, limit = 25): Promise<{ reports: Report[]; source: "mysql" | "demo" }> {
  const db = getDbPool();
  if (!db) return { reports: savedReports, source: "demo" };
  if (!userId) return { reports: savedReports, source: "demo" };

  const [rows] = await db.query("SELECT id FROM reports WHERE user_id = ? ORDER BY created_at DESC LIMIT ?", [userId, limit]);
  const ids = (rows as IdRow[]).map((row) => row.id);
  const reports = (await Promise.all(ids.map((id) => loadReportById(id, userId)))).filter(Boolean) as Report[];

  return { reports: reports.length ? reports : savedReports, source: reports.length ? "mysql" : "demo" };
}
