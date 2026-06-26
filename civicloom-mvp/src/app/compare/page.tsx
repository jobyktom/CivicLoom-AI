"use client";

import { useState } from "react";
import { savedReports } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import type { Report } from "@/lib/types";

const rows: [string, (report: Report) => string][] = [
  ["Opportunity score", (report) => `${report.opportunityScore}/100`],
  ["Population", (report) => report.metrics.population.toLocaleString()],
  ["Median income", (report) => `$${report.metrics.medianIncome.toLocaleString()}`],
  ["Median age", (report) => String(report.metrics.medianAge)],
  ["Employment", (report) => `${report.metrics.employedPct}%`],
];

export default function Compare() {
  const [selected, setSelected] = useState(savedReports.slice(0, 2).map((report) => report.id));
  const reports = savedReports.filter((report) => selected.includes(report.id));

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : current.length < 3 ? [...current, id] : current));
  }

  return (
    <main className="bg-[#faf9f6] px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-[.18em] text-[#285f8f]">Comparison</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#102033]">Put markets side by side.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Choose up to three saved locations and compare the core indicators with the same assumptions.</p>

        <div className="mt-6 flex flex-wrap gap-2">
          {savedReports.map((report) => {
            const active = selected.includes(report.id);
            return (
              <Button
                key={report.id}
                onClick={() => toggle(report.id)}
                variant={active ? "default" : "outline"}
                className={active ? "bg-[#18324a] text-white hover:bg-[#102033]" : "border-[#bdb5a7] bg-white text-[#18324a] hover:bg-[#f1eee8]"}
              >
                {report.locationName}
              </Button>
            );
          })}
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-[#ded8cb] bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#ded8cb] bg-[#f7f4ed]">
                <th className="p-5 font-medium text-slate-500">Metric</th>
                {reports.map((report) => (
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
                  {reports.map((report) => (
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
    </main>
  );
}
