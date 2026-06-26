"use client";

import { use, useEffect, useState } from "react";
import { Download, Lightbulb, MapPin, ShieldAlert, Users, type LucideIcon } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { demoReport } from "@/lib/mock-data";
import type { Report } from "@/lib/types";

const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [report, setReport] = useState<Report>(demoReport);

  useEffect(() => {
    let active = true;
    const saved = localStorage.getItem(`civicloom-report-${id}`);

    if (saved) {
      setReport(JSON.parse(saved));
      return;
    }

    fetch(`/api/reports/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (active && payload?.report) setReport(payload.report);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [id]);

  const bars = [
    { n: "Demand", v: 88 },
    { n: "Income fit", v: 84 },
    { n: "Customer fit", v: 79 },
    { n: "Risk", v: 72 },
  ];

  return (
    <main className="bg-[#f7f9fe] px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-5 sm:flex-row">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <MapPin className="h-4 w-4 text-[#1769ff]" />
              {report.locationName} · {report.radius} mile radius
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#061535]">{report.businessType}</h1>
          </div>
          <Button variant="outline" onClick={() => window.print()}>
            <Download className="mr-2" />
            Download PDF
          </Button>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
          <section className="space-y-5">
            <div className="rounded-[22px] bg-[#061535] p-7 text-white blue-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-blue-100">Opportunity score</p>
                  <p className="mt-1 text-6xl font-semibold">
                    {report.opportunityScore}
                    <span className="ml-2 text-lg font-normal text-slate-400">/100</span>
                  </p>
                </div>
                <Badge className="bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/15">Strong potential</Badge>
              </div>
              <p className="mt-5 max-w-xl leading-7 text-slate-300">{report.aiSummary}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Metric label="Population" value={fmt(report.metrics.population)} note="Place-level estimate" />
              <Metric label="Median household income" value={`$${fmt(report.metrics.medianIncome)}`} note="Annual household income" />
              <Metric label="Median age" value={`${report.metrics.medianAge} years`} note="Prime working age" />
              <Metric label="Employment" value={`${report.metrics.employedPct}%`} note="Of civilian labor force" />
            </div>

            <div className="rounded-[22px] border bg-white p-6">
              <h2 className="font-semibold">What drives the score</h2>
              <div className="mt-4 h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bars}>
                    <XAxis dataKey="n" tickLine={false} axisLine={false} fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="v" fill="#1769ff" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <aside className="space-y-5">
            <Insight icon={Lightbulb} title="Recommended approach" text={report.recommendation} />
            <Insight
              icon={Users}
              title="Ideal customer"
              text="Professionals ages 25-40 who value convenience, quality, and a neighborhood sense of belonging."
            />
            <Insight icon={ShieldAlert} title="Risk factors" text={report.riskSummary} />
          </aside>
        </div>
      </div>
    </main>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-[22px] border bg-white p-5 shadow-[0_8px_25px_rgba(26,62,125,.04)]">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-[#061535]">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{note}</p>
    </div>
  );
}

function Insight({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="rounded-[22px] border bg-white p-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-[#1769ff]" />
        {title}
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

