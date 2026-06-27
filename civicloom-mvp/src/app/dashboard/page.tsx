import Link from "next/link";
import { ArrowUpRight, Building2, Database, FileText, MapPinned, Plus, TrendingUp, UserRound, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getBillingStatus } from "@/lib/billing";
import { listSavedReports } from "@/lib/report-list";
import { listWatchlist } from "@/lib/value-add";

export const dynamic = "force-dynamic";

const scoreLabel = (score: number) => (score >= 75 ? "Strong" : score >= 60 ? "Watchlist" : "Caution");
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`));

export default async function Dashboard() {
  const user = await getCurrentUser();
  const { reports, source } = await listSavedReports(user?.id);
  const billing = await getBillingStatus(user?.id);
  const watchlist = await listWatchlist(user);
  const averageScore = reports.length ? Math.round(reports.reduce((sum, report) => sum + report.opportunityScore, 0) / reports.length) : 0;
  const topReport = [...reports].sort((a, b) => b.opportunityScore - a.opportunityScore)[0];

  return (
    <main className="ledger-surface px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <section className="overflow-hidden rounded-[28px] border border-[#d6cebf] bg-white soft-lift">
          <div className="grid lg:grid-cols-[1fr_340px]">
            <div className="p-7 sm:p-9">
              <p className="text-xs font-bold uppercase tracking-[.24em] text-[#285f8f]">Workspace</p>
              <h1 className="font-display mt-4 max-w-3xl text-5xl font-semibold leading-[.96] tracking-[-.04em] text-[#102033] sm:text-6xl">
                Your market intelligence desk.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
                {user
                  ? `${user.name || user.email}, this is your saved report ledger. ${source === "mysql" ? "Reports are syncing with Hostinger MySQL." : "Demo records are showing until the database is available."}`
                  : source === "mysql"
                    ? "Showing saved reports across the workspace. Sign in to keep reports attached to your own account."
                    : "Demo records are showing until database variables are configured."}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="h-11 bg-[#18324a] px-5 text-white hover:bg-[#102033]">
                  <Link href="/report/new">
                    <Plus className="mr-2" />
                    New report
                  </Link>
                </Button>
                {!user && (
                  <Button asChild variant="outline" className="h-11 border-[#bdb5a7] bg-white px-5 text-[#18324a] hover:bg-[#f1eee8]">
                    <Link href="/auth">
                      <UserRound className="mr-2" />
                      Sign in
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            <aside className="border-t border-[#ded8cb] bg-[#18324a] p-7 text-white lg:border-l lg:border-t-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#d8cdbb]">Current read</p>
                <Database className="h-5 w-5 text-[#d8cdbb]" />
              </div>
              <p className="font-display mt-8 text-6xl font-semibold leading-none">{averageScore || "—"}</p>
              <p className="mt-2 text-sm text-slate-200">Average opportunity score</p>
              <div className="mt-8 rounded-2xl border border-white/15 p-4">
                <p className="text-xs uppercase tracking-[.16em] text-[#d8cdbb]">Best current market</p>
                <p className="mt-3 text-lg font-semibold">{topReport?.locationName || "No reports yet"}</p>
                <p className="mt-1 text-sm text-slate-300">{topReport ? `${topReport.businessType} · ${topReport.opportunityScore}/100` : "Create a report to begin."}</p>
              </div>
            </aside>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <MetricCard icon={FileText} label="Saved reports" value={String(reports.length)} note="Latest 25 shown" />
          <MetricCard icon={TrendingUp} label="Average score" value={averageScore ? `${averageScore}/100` : "—"} note="Across visible reports" />
          <MetricCard icon={MapPinned} label="Top location" value={topReport?.locationName || "—"} note={topReport ? scoreLabel(topReport.opportunityScore) : "Run a report"} />
          <MetricCard icon={FileText} label="Usage" value={`${billing.reportsUsed}/${billing.reportLimit}`} note={`${billing.label} plan`} />
          <MetricCard icon={Building2} label="Data mode" value={source === "mysql" ? "MySQL" : "Demo"} note={source === "mysql" ? "Remote database" : "Fallback data"} />
        </section>

        <section className="mt-8 overflow-hidden rounded-[24px] border border-[#d6cebf] bg-white">
          <div className="flex flex-col justify-between gap-3 border-b border-[#ded8cb] bg-[#f7f4ed] px-6 py-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-[#285f8f]">Report ledger</p>
              <h2 className="font-display mt-1 text-3xl font-semibold tracking-[-.03em] text-[#102033]">Saved market reports</h2>
            </div>
            <p className="text-sm text-slate-500">Sorted by newest first</p>
          </div>

          {reports.length ? (
            <div className="divide-y divide-[#eee8dc]">
              {reports.map((report) => (
                <Link
                  href={`/report/${report.id}`}
                  key={report.id}
                  className="group grid gap-5 px-6 py-5 transition hover:bg-[#faf9f6] lg:grid-cols-[1.35fr_.85fr_.55fr_.55fr_32px] lg:items-center"
                >
                  <div className="flex items-start gap-4">
                    <span className="mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#ded8cb] bg-[#faf9f6] text-[#285f8f]">
                      <FileText className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-semibold text-[#102033]">{report.businessType}</p>
                      <p className="mt-1 line-clamp-1 text-sm text-slate-500">{report.targetCustomer}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#102033]">{report.locationName}</p>
                    <p className="mt-1 text-xs uppercase tracking-[.14em] text-slate-400">
                      {report.geographyType} · {report.radius} mi
                    </p>
                  </div>
                  <div>
                    <span className="inline-flex rounded-full border border-[#cfc7b9] bg-[#faf9f6] px-3 py-1 text-sm font-semibold text-[#285f8f]">
                      {report.opportunityScore}/100
                    </span>
                    <p className="mt-1 text-xs text-slate-400">{scoreLabel(report.opportunityScore)}</p>
                  </div>
                  <p className="text-sm text-slate-500">{formatDate(report.createdAt)}</p>
                  <ArrowUpRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#285f8f]" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-6 py-16 text-center">
              <p className="font-display text-3xl font-semibold tracking-[-.03em] text-[#102033]">No reports saved yet.</p>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">Create your first local market report and it will appear in this workspace automatically.</p>
              <Button asChild className="mt-6 bg-[#18324a] text-white hover:bg-[#102033]">
                <Link href="/report/new">Create report</Link>
              </Button>
            </div>
          )}
        </section>

        <section className="mt-8 rounded-[24px] border border-[#d6cebf] bg-white p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-[#285f8f]">Watchlist</p>
              <h2 className="font-display mt-1 text-3xl font-semibold tracking-[-.03em] text-[#102033]">Markets to monitor</h2>
            </div>
            <p className="text-sm text-slate-500">{user ? `${watchlist.length} saved` : "Sign in to save markets"}</p>
          </div>
          {watchlist.length ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {watchlist.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-2xl border border-[#eee8dc] bg-[#faf9f6] p-4">
                  <p className="text-sm font-semibold text-[#102033]">{item.locationName}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.businessType}</p>
                  <p className="mt-3 text-xs uppercase tracking-[.14em] text-slate-400">
                    {item.lastScore ? `Last score ${item.lastScore}/100` : "Awaiting refresh"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-2xl border border-[#eee8dc] bg-[#faf9f6] p-5 text-sm leading-6 text-slate-600">
              Save promising report locations to track them over time. Watchlists are the start of recurring market alerts.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

function MetricCard({ icon: Icon, label, value, note }: { icon: LucideIcon; label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-[#ded8cb] bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-500">{label}</p>
        <Icon className="h-4 w-4 text-[#285f8f]" />
      </div>
      <p className="font-display mt-4 truncate text-3xl font-semibold tracking-[-.03em] text-[#102033]">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{note}</p>
    </div>
  );
}
