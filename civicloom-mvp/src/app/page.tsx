import Link from "next/link";
import { ArrowRight, BarChart3, FileText, MapPin, ShieldCheck, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";

const benefits = [
  [UsersRound, "Know the local customer", "Demographics, income, housing and commute patterns translated into a practical market view."],
  [MapPin, "Shortlist stronger locations", "Compare places with the same scoring model so teams can discuss trade-offs clearly."],
  [FileText, "Create decision-ready reports", "Export a concise narrative your operator, investor or client can understand quickly."],
] as const;

const sampleRows = [
  ["Population", "967,862"],
  ["Median household income", "$89,415"],
  ["Median age", "35.1"],
  ["Employment", "67%"],
] as const;

export default function Home() {
  return (
    <main>
      <section className="border-b border-[#ded8cb] bg-[#faf9f6] px-6 py-16 lg:px-10 lg:py-24">
        <div className="mx-auto grid max-w-[1320px] items-center gap-12 lg:grid-cols-[1fr_.9fr]">
          <div>
            <p className="mb-6 text-sm font-bold uppercase tracking-[.18em] text-[#285f8f]">Local market intelligence</p>
            <h1 className="max-w-[760px] text-5xl font-semibold leading-[1.02] tracking-[-.055em] text-[#102033] sm:text-6xl lg:text-[72px]">
              Pick better business locations with clear local data.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600">
              CivicLoom AI turns Census data, scoring logic and plain-English recommendations into a market report your team can act on.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 bg-[#18324a] px-7 text-base text-white hover:bg-[#102033]">
                <Link href="/report/new">
                  Generate free report <ArrowRight className="ml-2" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 border-[#bdb5a7] bg-transparent px-7 text-base text-[#18324a] hover:bg-[#f1eee8]">
                <Link href="/report/demo-1">View sample report</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#285f8f]" />
                No credit card required
              </span>
              <span>·</span>
              <span>Live ACS data when available</span>
              <span>·</span>
              <span>Transparent scoring</span>
            </div>
          </div>
          <SampleReportCard />
        </div>
      </section>

      <section className="bg-white px-6 py-16 lg:px-10">
        <div className="mx-auto max-w-[1320px]">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[.18em] text-[#285f8f]">Built for local decisions</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#102033]">A quieter workflow for high-stakes location choices.</h2>
          </div>
          <div className="mt-9 grid gap-5 lg:grid-cols-3">
            {benefits.map(([Icon, title, body]) => (
              <div key={title} className="rounded-2xl border border-[#ded8cb] bg-[#faf9f6] p-7">
                <div className="grid h-12 w-12 place-items-center rounded-xl border border-[#cfc7b9] bg-white text-[#285f8f]">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-xl font-semibold tracking-tight text-[#102033]">{title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function SampleReportCard() {
  return (
    <div className="rounded-[24px] border border-[#d6cebf] bg-white p-6 shadow-[0_18px_45px_rgba(16,32,51,.08)]">
      <div className="flex items-start justify-between gap-4 border-b border-[#ded8cb] pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-500">Sample report</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#102033]">Specialty coffee shop</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
            <MapPin className="h-4 w-4 text-[#285f8f]" />
            Austin, Texas
          </p>
        </div>
        <div className="rounded-xl border border-[#ded8cb] bg-[#faf9f6] px-4 py-3 text-right">
          <p className="text-xs text-slate-500">Opportunity</p>
          <p className="text-3xl font-semibold text-[#18324a]">82</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {sampleRows.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[#eee8dc] bg-[#faf9f6] p-4">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-1 text-lg font-semibold text-[#102033]">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-xl border border-[#ded8cb] bg-white p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#102033]">
          <BarChart3 className="h-4 w-4 text-[#285f8f]" />
          Recommendation
        </div>
        <p className="text-sm leading-6 text-slate-600">
          Strong demand indicators and a young professional base make this a good test market, with rent and competition as the main risks to validate.
        </p>
      </div>
    </div>
  );
}
