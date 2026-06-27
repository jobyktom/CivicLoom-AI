import { getCurrentUser } from "@/lib/auth";
import { listSavedReports } from "@/lib/report-list";
import { CompareClient } from "./compare-client";

export const dynamic = "force-dynamic";

export default async function Compare() {
  const user = await getCurrentUser();
  const { reports, source } = await listSavedReports(user?.id, 25);

  return <CompareClient reports={reports} source={source} />;
}
