import { savedReports } from "@/lib/mock-data";
import { getPrismaClient } from "@/lib/prisma";
import { loadReportById } from "@/lib/report-loader";
import type { Report } from "@/lib/types";

export async function listSavedReports(userId?: string | null, limit = 25): Promise<{ reports: Report[]; source: "mysql" | "demo" }> {
  const prisma = getPrismaClient();
  if (!prisma) return { reports: savedReports, source: "demo" };
  if (!userId) return { reports: savedReports, source: "demo" };

  const rows = await prisma.report.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true },
  });
  const ids = rows.map((row) => row.id);
  const reports = (await Promise.all(ids.map((id) => loadReportById(id, userId)))).filter(Boolean) as Report[];

  return { reports: reports.length ? reports : savedReports, source: reports.length ? "mysql" : "demo" };
}
