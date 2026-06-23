import Link from "next/link";
import { ArrowRight, BarChart3, BrainCircuit, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const benefits = [
  [MapPin, "Know the neighborhood", "Census-backed local signals, distilled into the things that actually matter."],
  [BrainCircuit, "Make the case faster", "Turn demographic complexity into a clear, practical recommendation in minutes."],
  [BarChart3, "Compare with confidence", "Line up markets side-by-side before committing budget, time, or attention."],
];

export default function Home() {
  return <main className="overflow-hidden">
    <section className="relative px-6 pb-24 pt-20 sm:pt-28">
      <div className="mx-auto max-w-6xl text-center">
        <div className="mx-auto mb-7 flex w-fit items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-medium text-cyan-800"><Sparkles className="h-4 w-4" />Location intelligence for ambitious local businesses</div>
        <h1 className="mx-auto max-w-4xl text-5xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-7xl">Find the next place<br/><span className="text-cyan-700">your business can thrive.</span></h1>
        <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-slate-600">CivicLoom turns public data into lucid market reports, so you can move from a hunch to a confident local decision.</p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"><Button asChild size="lg" className="bg-slate-950 px-6"><Link href="/report/new">Create a free report <ArrowRight className="ml-2" /></Link></Button><Button asChild size="lg" variant="outline"><Link href="/report/demo-1">View sample report</Link></Button></div>
        <p className="mt-4 text-sm text-slate-500">No credit card required · First report is on us</p>
      </div>
      <div className="mx-auto mt-16 max-w-5xl rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl shadow-cyan-950/10">
        <div className="rounded-xl bg-slate-950 p-6 text-left text-white sm:p-8"><div className="flex items-start justify-between"><div><p className="text-sm text-cyan-300">Opportunity score</p><p className="mt-1 text-5xl font-semibold">82 <span className="text-base font-normal text-slate-400">/ 100</span></p></div><span className="rounded-full bg-emerald-400/15 px-3 py-1 text-sm text-emerald-300">Strong potential</span></div><div className="mt-8 grid gap-3 sm:grid-cols-3"><Mini title="Population" value="128,500" note="Growing 4.2%"/><Mini title="Median income" value="$78,400" note="Above market"/><Mini title="Target fit" value="High" note="Young professionals"/></div></div>
      </div>
    </section>
    <section className="bg-slate-50 px-6 py-24"><div className="mx-auto max-w-6xl"><p className="text-sm font-semibold uppercase tracking-[.18em] text-cyan-700">A clearer local picture</p><h2 className="mt-3 max-w-xl text-4xl font-semibold tracking-tight text-slate-950">From raw census data to a decision you can defend.</h2><div className="mt-12 grid gap-6 md:grid-cols-3">{benefits.map(([Icon,title,body]) => <div key={title as string} className="rounded-2xl border border-slate-200 bg-white p-7"><div className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-50 text-cyan-700"><Icon className="h-5 w-5"/></div><h3 className="mt-5 text-lg font-semibold">{title as string}</h3><p className="mt-2 leading-7 text-slate-600">{body as string}</p></div>)}</div></div></section>
  </main>
}

function Mini({title,value,note}:{title:string;value:string;note:string}) { return <div className="rounded-lg border border-white/10 bg-white/5 p-4"><p className="text-xs text-slate-400">{title}</p><p className="mt-1 text-xl font-semibold">{value}</p><p className="mt-1 text-xs text-emerald-300">{note}</p></div> }
