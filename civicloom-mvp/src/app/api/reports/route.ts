import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listSavedReports } from "@/lib/report-list";

export async function GET() {
  const user = await getCurrentUser();
  const { reports, source } = await listSavedReports(user?.id);

  return NextResponse.json({ reports, source });
}
