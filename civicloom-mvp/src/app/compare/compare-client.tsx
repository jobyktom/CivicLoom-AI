"use client";

import { useMemo, useState } from "react";
import { BarChart3, CheckCircle2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Report } from "@/lib/types";

const number = (value: number) => new Intl.NumberFormat("en-US").format(Math.round(value));
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const pct = (value: number) => `${Math.round(value)}%`;

const rows: [string, (report: Report) => string][] = [
  ["Opportunity score", (report) => `${report.opportunityScore}/100`],
  ["Population", (report) => number(report.metrics.population)],
  ["Median income", (report) => money(report.metrics.medianIncome)],
  ["Median age", (report) => `${report.metrics.medianAge.toFixed(1)} years`],
  ["Employment", (report) => pct(report.metrics.employedPct)],
  ["Housing units", (report) => number(report.metrics.housingUnits)],
  ["Renter occupied", (report) => pct(report.metrics.renterPct)],
  ["Bachelor degree", (report) => pct(report.metrics.bachelorPct)],
  ["Work from home", (report) => pct(report.metrics.commuteWorkFromHomePct)],
];

function scoreLabel(score: number) {
  if (score >= 80) return "Best candidate";
  if (score >= 70) return "Strong contender";
  if (score >= 60) return "Needs validation";
  return "Higher risk";
}

export function CompareClient({ reports, source }: { reports: Report[]; source: "mysql" | "demo" }) {
  const [selected, setSelected] = useState(reports.slice(0, Math.min(3, reports.length)).map((report) => report.id));
  const compared = useMemo(() => reports.filter((report) => selected.includes(report.id)), [reports, selected]);
  const winner = [...compared].sort((a, b) => b.opportunityScore - a.opportunityScore)[0];

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : current.length < 3 ? [...current, id] : current));
  }

  return (
    <main className="bg-[#faf9f6] px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <section>
            <p className="text-sm font-semibold uppercase tracking-[.18em] text-[#285f8f]">Comparison</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[#102033]">Put saved markets side by side.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Choose up to three saved reports and compare score, demographics, housing, education, and work patterns with the same assumptions.
            </p>
          </section>

          <aside className="rounded-2xl border border-[#ded8cb] bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#102033]">
              <Trophy className="h-4 w-4 text-[#285f8f]" />
              Current leader
            </div>
            <p className="mt-4 text-2xl font-semibold tracking-tight text-[#102033]">{winner?.locationName || "Select a report"}</p>
            <p className="mt-1 text-sm text-slate-500">
              {winner ? `${winner.businessType} · ${winner.opportunityScore}/100 · ${scoreLabel(winner.opportunityScore)}` : "Pick up to three markets to compare."}
            </p>
          </aside>
        </div>

        <div className="mt-7 flex flex-wrap gap-2">
          {reports.map((report) => {
            const active = selected.includes(report.id);
            return (
              <Button
                key={report.id}
                onClick={() => toggle(report.id)}
                variant={active ? "default" : "outline"}
                className={active ? "bg-[#18324a] text-white hover:bg-[#102033]" : "border-[#bdb5a7] bg-white text-[#18324a] hover:bg-[#f1eee8]"}
              >
                {active && <CheckCircle2 className="mr-2 h-4 w-4" />}
                {report.locationName}
              </Button>
            );
          })}
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {compared.map((report) => (
            <article key={report.id} className="rounded-2xl border border-[#ded8cb] bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-500">{report.businessType}</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#102033]">{report.locationName}</h2>
              <div className="mt-5 flex items-end justify-between border-t border-[#eee8dc] pt-5">
                <div>
                  <p className="text-sm text-slate-500">Opportunity score</p>
                  <p className="mt-1 text-4xl font-semibold text-[#18324a]">{report.opportunityScore}</p>
                </div>
                <span className="rounded-full border border-[#cfc7b9] bg-[#faf9f6] px-3 py-1 text-sm font-semibold text-[#285f8f]">{scoreLabel(report.opportunityScore)}</span>
              </div>
              <p className="mt-5 text-sm leading-6 text-slate-600">{report.details?.finalRecommendation || report.recommendation}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-[#ded8cb] bg-white">
          <div className="flex items-center justify-between border-b border-[#ded8cb] bg-[#f7f4ed] p-5">
            <div className="flex items-center gap-2 font-semibold text-[#102033]">
              <BarChart3 className="h-5 w-5 text-[#285f8f]" />
              Side-by-side indicators
            </div>
            <span className="text-xs uppercase tracking-[.16em] text-slate-500">{source === "mysql" ? "Saved reports" : "Demo fallback"}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#ded8cb]">
                  <th className="p-5 font-medium text-slate-500">Metric</th>
                  {compared.map((report) => (
                    <th key={report.id} className="p-5 font-semibold text-[#102033]">
                      {report.locationName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, getValue]) => (
                  <tr key={label} className="border-b border-[#eee8dc] last:border-0">
                    <td className="p-5 text-slate-500">{label}</td>
                    {compared.map((report) => (
                      <td key={report.id} className="p-5 font-medium text-[#102033]">
                        {getValue(report)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
