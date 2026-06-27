"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, MapPin, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Template = {
  id: string;
  name: string;
  description: string;
  assumptions: {
    targetCustomer: string;
    radius: number;
    reportType: string;
  };
};

export default function NewReport() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [businessType, setBusinessType] = useState("Specialty coffee shop");
  const [location, setLocation] = useState("Austin, Texas");
  const [targetCustomer, setTargetCustomer] = useState("Young professionals");
  const [radius, setRadius] = useState("3");
  const [reportType, setReportType] = useState("Market opportunity");

  useEffect(() => {
    fetch("/api/templates")
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => setTemplates(payload?.templates || []))
      .catch(() => setTemplates([]));
  }, []);

  function applyTemplate(template: Template) {
    setBusinessType(template.name);
    setTargetCustomer(template.assumptions.targetCustomer);
    setRadius(String(template.assumptions.radius));
    setReportType(template.assumptions.reportType);
  }

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
      if (response.status === 401) {
        router.push("/auth");
        return;
      }
      if (response.status === 402) {
        router.push("/pricing");
        return;
      }
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
            Start from a business template or enter your own concept. CivicLoom will combine Census data, a transparent score and practical recommendations.
          </p>

          <div className="mt-8 rounded-2xl border border-[#ded8cb] bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#102033]">
              <Wand2 className="h-4 w-4 text-[#285f8f]" />
              Business templates
            </div>
            <div className="mt-4 space-y-3">
              {templates.slice(0, 4).map((template) => (
                <button
                  type="button"
                  key={template.id}
                  onClick={() => applyTemplate(template)}
                  className="w-full rounded-xl border border-[#eee8dc] bg-[#faf9f6] p-4 text-left transition hover:border-[#bdb5a7] hover:bg-white"
                >
                  <span className="text-sm font-semibold text-[#102033]">{template.name}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">{template.description}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <form onSubmit={submit} className="space-y-6 rounded-[22px] border border-[#d6cebf] bg-white p-7 shadow-[0_14px_36px_rgba(16,32,51,.06)]">
          <label className="block text-sm font-medium text-[#102033]">
            Business type
            <Input name="businessType" required value={businessType} onChange={(e) => setBusinessType(e.target.value)} className="mt-2 h-11 border-[#cfc7b9] bg-white" />
          </label>
          <label className="block text-sm font-medium text-[#102033]">
            U.S. location
            <Input name="location" required value={location} onChange={(e) => setLocation(e.target.value)} className="mt-2 h-11 border-[#cfc7b9] bg-white" />
          </label>
          <label className="block text-sm font-medium text-[#102033]">
            Target customer
            <Input name="targetCustomer" required value={targetCustomer} onChange={(e) => setTargetCustomer(e.target.value)} className="mt-2 h-11 border-[#cfc7b9] bg-white" />
          </label>

          <div className="grid gap-6 sm:grid-cols-2">
            <label className="text-sm font-medium text-[#102033]">
              Search radius
              <select name="radius" value={radius} onChange={(e) => setRadius(e.target.value)} className="mt-2 h-11 w-full rounded-lg border border-[#cfc7b9] bg-white px-3 text-sm">
                <option value="3">3 miles</option>
                <option value="5">5 miles</option>
                <option value="10">10 miles</option>
              </select>
            </label>
            <label className="text-sm font-medium text-[#102033]">
              Report type
              <select name="reportType" value={reportType} onChange={(e) => setReportType(e.target.value)} className="mt-2 h-11 w-full rounded-lg border border-[#cfc7b9] bg-white px-3 text-sm">
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
