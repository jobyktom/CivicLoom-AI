import { NextRequest, NextResponse } from "next/server";
import { loadReportById } from "@/lib/report-loader";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await loadReportById(id);

  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  return NextResponse.json({ report, source: report.dataSource || "mysql" });
}
