"use client";

import { use, useEffect, useState } from "react";
import { BriefcaseBusiness, Download, Home, Lightbulb, MapPin, Megaphone, ShieldAlert, Users, type LucideIcon } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { demoReport } from "@/lib/mock-data";
import { calculateScoreBreakdown } from "@/lib/scoring";
import type { Report, ReportDetails } from "@/lib/types";

const fmt = (n: number) => new Intl.NumberFormat("en-US").format(Math.round(n));
const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const pct = (n: number) => `${Math.round(n)}%`;

function getDetails(report: Report): ReportDetails {
  return report.details || demoReport.details!;
}

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

  const details = getDetails(report);
  const breakdown = report.scoreBreakdown || calculateScoreBreakdown(report.metrics, report.businessType, report.targetCustomer);
  const bars = [
    { n: "Demand", v: breakdown.demand },
    { n: "Income", v: breakdown.incomeFit },
    { n: "Fit", v: breakdown.customerFit },
    { n: "Risk", v: breakdown.risk },
  ];

  return (
    <main className="bg-[#f7f9fe] px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-5 sm:flex-row">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <MapPin className="h-4 w-4 text-[#1769ff]" />
              {report.locationName} - {report.radius} mile radius
              <Badge variant="outline" className="ml-1 bg-white">
                {report.dataSource === "census" ? "Live ACS Census data" : "Demo fallback data"}
              </Badge>
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#061535]">{report.businessType}</h1>
          </div>
          <Button asChild variant="outline">
            <a href={`/api/reports/${id}/pdf`} download>
              <Download className="mr-2" />
              Download PDF
            </a>
          </Button>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
          <section className="space-y-5">
            <div className="rounded-[22px] bg-[#061535] p-7 text-white blue-shadow">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-blue-100">Opportunity score</p>
                  <p className="mt-1 text-6xl font-semibold">
                    {report.opportunityScore}
                    <span className="ml-2 text-lg font-normal text-slate-400">/100</span>
                  </p>
                </div>
                <Badge className="bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/15">
                  {report.opportunityScore >= 75 ? "Strong potential" : report.opportunityScore >= 60 ? "Worth testing" : "Needs caution"}
                </Badge>
              </div>
              <p className="mt-5 max-w-3xl leading-7 text-slate-300">{details.executiveSummary}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Population" value={fmt(report.metrics.population)} note="ACS 5-year estimate" />
              <Metric label="Median income" value={money(report.metrics.medianIncome)} note="Household income" />
              <Metric label="Median age" value={`${report.metrics.medianAge.toFixed(1)} years`} note="Customer maturity" />
              <Metric label="Employment" value={pct(report.metrics.employedPct)} note="Labor force employed" />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-[22px] border bg-white p-6">
                <h2 className="font-semibold">What drives the score</h2>
                <div className="mt-4 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bars}>
                      <XAxis dataKey="n" tickLine={false} axisLine={false} fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="v" fill="#1769ff" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-[22px] border bg-white p-6">
                <h2 className="font-semibold">Market composition</h2>
                <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
                  <MiniStat label="Housing units" value={fmt(report.metrics.housingUnits)} />
                  <MiniStat label="Households" value={fmt(report.metrics.households)} />
                  <MiniStat label="Owner occupied" value={pct(report.metrics.ownerPct)} />
                  <MiniStat label="Renter occupied" value={pct(report.metrics.renterPct)} />
                  <MiniStat label="Bachelor degree" value={pct(report.metrics.bachelorPct)} />
                  <MiniStat label="Graduate degree" value={pct(report.metrics.graduatePct)} />
                  <MiniStat label="Median rent" value={report.metrics.medianGrossRent ? money(report.metrics.medianGrossRent) : "N/A"} />
                  <MiniStat label="Work from home" value={pct(report.metrics.commuteWorkFromHomePct)} />
                </div>
              </div>
            </div>

            <Section title="Why this location works" items={details.whyThisLocationWorks} />
            <Section title="Suggested next steps" items={details.suggestedNextSteps} />
          </section>

          <aside className="space-y-5">
            <Insight icon={Lightbulb} title="Final recommendation" text={details.finalRecommendation} />
            <Insight icon={Users} title="Ideal customer" text={details.idealCustomer} />
            <Insight icon={Megaphone} title="Marketing angle" text={details.marketingAngle} />
            <ListInsight icon={BriefcaseBusiness} title="Demand drivers" items={details.demandDrivers} />
            <ListInsight icon={ShieldAlert} title="Risk factors" items={details.risks} />
            <Insight
              icon={Home}
              title="Commute pattern"
              text={`${pct(report.metrics.commuteDrivePct)} drive, ${pct(report.metrics.commuteTransitPct)} use transit, ${pct(report.metrics.commuteWalkPct)} walk, and ${pct(report.metrics.commuteWorkFromHomePct)} work from home.`}
            />
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-[#061535]">{value}</p>
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[22px] border bg-white p-6">
      <h2 className="font-semibold">{title}</h2>
      <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1769ff]" />
            {item}
          </li>
        ))}
      </ul>
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

function ListInsight({ icon: Icon, title, items }: { icon: LucideIcon; title: string; items: string[] }) {
  return (
    <div className="rounded-[22px] border bg-white p-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-[#1769ff]" />
        {title}
      </div>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
        {items.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </div>
  );
}

