"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const plans: [string, string, string, string[]][] = [
  ["Free", "$0", "1 report / month", ["One market report", "Census data overview", "Basic score"]],
  ["Starter", "$19", "per month", ["5 reports / month", "AI market recommendations", "Location comparison"]],
  ["Pro", "$49", "per month", ["20 reports / month", "PDF exports", "Priority data refresh"]],
  ["Agency", "$129", "per month", ["Unlimited reports", "Team workspace", "Client-ready branding"]],
];

export default function Pricing() {
  const [loading, setLoading] = useState("");

  async function checkout(name: string) {
    if (name === "Free") return location.assign("/report/new");
    setLoading(name);
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: name.toLowerCase() }),
    });
    const payload = await response.json();
    if (payload.url) location.assign(payload.url);
    else alert(payload.error);
    setLoading("");
  }

  return (
    <main className="bg-[#faf9f6] px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[.18em] text-[#285f8f]">Simple, dollar-based pricing</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#102033] sm:text-5xl">A plan for every local decision workflow.</h1>
          <p className="mt-4 leading-7 text-slate-600">All prices are in USD. Secure Stripe Checkout launches when configured.</p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {plans.map(([name, price, term, features], index) => {
            const highlighted = index === 2;
            return (
              <div
                key={name}
                className={`relative rounded-2xl border p-6 text-left ${
                  highlighted ? "border-[#18324a] bg-[#18324a] text-white" : "border-[#ded8cb] bg-white text-[#102033]"
                }`}
              >
                {highlighted && <span className="absolute -top-3 rounded-full bg-[#f7f4ed] px-3 py-1 text-xs font-semibold text-[#18324a]">Most popular</span>}
                <h2 className="text-lg font-semibold">{name}</h2>
                <p className="mt-4 text-4xl font-semibold">{price}</p>
                <p className={`mt-1 text-sm ${highlighted ? "text-slate-200" : "text-slate-500"}`}>{term}</p>
                <Button
                  onClick={() => checkout(name)}
                  disabled={loading === name}
                  className={`mt-6 w-full ${
                    highlighted ? "bg-white text-[#18324a] hover:bg-[#f1eee8]" : "bg-[#18324a] text-white hover:bg-[#102033]"
                  }`}
                >
                  {loading === name ? "Opening checkout…" : `Choose ${name}`}
                </Button>
                <ul className={`mt-6 space-y-3 text-sm ${highlighted ? "text-slate-100" : "text-slate-600"}`}>
                  {features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <Check className={`h-4 w-4 shrink-0 ${highlighted ? "text-white" : "text-[#285f8f]"}`} />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
