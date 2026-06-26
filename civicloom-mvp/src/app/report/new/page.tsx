"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const fields = [
  ["businessType", "Business type", "Specialty coffee shop"],
  ["location", "U.S. location", "Austin, Texas"],
  ["targetCustomer", "Target customer", "Young professionals"],
] as const;

export default function NewReport() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);

    try {
      const response = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form)),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      localStorage.setItem(`civicloom-report-${payload.report.id}`, JSON.stringify(payload.report));
      router.push(`/report/${payload.report.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-[#faf9f6] px-6 py-14">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[.72fr_1fr]">
        <section>
          <p className="text-sm font-semibold uppercase tracking-[.18em] text-[#285f8f]">New market report</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#102033]">Tell us where you&apos;re looking.</h1>
          <p className="mt-4 max-w-md leading-7 text-slate-600">
            We&apos;ll combine live Census data, a transparent score and a practical recommendation for your location decision.
          </p>
          <div className="mt-8 rounded-2xl border border-[#ded8cb] bg-white p-5">
            <p className="text-sm font-semibold text-[#102033]">What happens next</p>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <li>1. Resolve the location to Census place or county data.</li>
              <li>2. Score demand, income fit, customer fit and risk.</li>
              <li>3. Generate a plain-English market report you can save.</li>
            </ol>
          </div>
        </section>

        <form onSubmit={submit} className="space-y-6 rounded-[22px] border border-[#d6cebf] bg-white p-7 shadow-[0_14px_36px_rgba(16,32,51,.06)]">
          {fields.map(([name, label, value]) => (
            <label key={name} className="block text-sm font-medium text-[#102033]">
              {label}
              <Input name={name} required defaultValue={value} className="mt-2 h-11 border-[#cfc7b9] bg-white" />
            </label>
          ))}

          <div className="grid gap-6 sm:grid-cols-2">
            <label className="text-sm font-medium text-[#102033]">
              Search radius
              <select name="radius" className="mt-2 h-11 w-full rounded-lg border border-[#cfc7b9] bg-white px-3 text-sm">
                <option value="3">3 miles</option>
                <option value="5">5 miles</option>
                <option value="10">10 miles</option>
              </select>
            </label>
            <label className="text-sm font-medium text-[#102033]">
              Report type
              <select name="reportType" className="mt-2 h-11 w-full rounded-lg border border-[#cfc7b9] bg-white px-3 text-sm">
                <option>Market opportunity</option>
                <option>Location comparison</option>
                <option>Audience profile</option>
              </select>
            </label>
          </div>

          <div className="rounded-xl border border-[#ded8cb] bg-[#faf9f6] p-4 text-sm leading-6 text-[#18324a]">
            <MapPin className="mr-2 inline h-4 w-4 text-[#285f8f]" />
            Live reports use place-level or county-level ACS data when Census can resolve the location.
          </div>

          {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          <Button disabled={loading} className="h-11 w-full bg-[#18324a] text-white hover:bg-[#102033]">
            {loading ? (
              <>
                <Loader2 className="mr-2 animate-spin" />
                Building your report…
              </>
            ) : (
              <>
                Generate report <ArrowRight className="ml-2" />
              </>
            )}
          </Button>
        </form>
      </div>
    </main>
  );
}
