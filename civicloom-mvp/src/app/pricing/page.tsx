"use client";

import { Check, CreditCard } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const plans: [string, string, string, string[]][] = [
  ["Free", "$0", "1 report / month", ["One market report", "Census data overview", "Basic score"]],
  ["Starter", "$19", "per month", ["5 reports / month", "AI market recommendations", "Location comparison"]],
  ["Pro", "$49", "per month", ["20 reports / month", "PDF exports", "Priority data refresh"]],
  ["Agency", "$129", "per month", ["100 reports / month", "Team workspace", "Client-ready branding"]],
];

type BillingStatus = {
  plan: string;
  label: string;
  status: string;
  reportLimit: number;
  reportsUsed: number;
  reportsRemaining: number;
  stripeCustomerId?: string | null;
};

export default function Pricing() {
  const [loading, setLoading] = useState("");
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [billingError, setBillingError] = useState("");

  useEffect(() => {
    fetch("/api/billing/status")
      .then((response) => response.json())
      .then((payload) => {
        setBilling(payload.billing || null);
        setAuthenticated(Boolean(payload.authenticated));
      })
      .catch(() => setBillingError("Billing status is temporarily unavailable."));
  }, []);

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
    else if (response.status === 401) location.assign("/auth");
    else alert(payload.error);
    setLoading("");
  }

  async function manageBilling() {
    setLoading("portal");
    const response = await fetch("/api/billing/portal", { method: "POST" });
    const payload = await response.json();
    if (payload.url) location.assign(payload.url);
    else if (response.status === 401) location.assign("/auth");
    else alert(payload.error || "Unable to open billing portal.");
    setLoading("");
  }

  return (
    <main className="bg-[#faf9f6] px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-end">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[.18em] text-[#285f8f]">Simple, dollar-based pricing</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#102033] sm:text-5xl">A plan for every local decision workflow.</h1>
            <p className="mt-4 leading-7 text-slate-600">All prices are in USD. Secure Stripe Checkout opens when Stripe price IDs are configured.</p>
          </div>

          <div className="rounded-2xl border border-[#ded8cb] bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-[#f1eee8] p-2 text-[#285f8f]">
                <CreditCard className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[.16em] text-slate-500">Your billing</p>
                <h2 className="mt-1 text-2xl font-semibold text-[#102033]">{billing ? `${billing.label} plan` : "Checking plan..."}</h2>
              </div>
            </div>
            {billing ? (
              <p className="mt-4 text-sm leading-6 text-slate-600">
                {authenticated
                  ? `${billing.reportsUsed} of ${billing.reportLimit} reports used this period. ${billing.reportsRemaining} remaining.`
                  : "Sign in to track usage, upgrade, and manage billing."}
              </p>
            ) : (
              <p className="mt-4 text-sm leading-6 text-slate-600">{billingError || "Loading your current usage and plan."}</p>
            )}
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              {authenticated && billing?.stripeCustomerId ? (
                <Button onClick={manageBilling} disabled={loading === "portal"} className="bg-[#18324a] text-white hover:bg-[#102033]">
                  {loading === "portal" ? "Opening..." : "Manage billing"}
                </Button>
              ) : (
                <Button onClick={() => location.assign(authenticated ? "/report/new" : "/auth")} className="bg-[#18324a] text-white hover:bg-[#102033]">
                  {authenticated ? "Create report" : "Sign in"}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {plans.map(([name, price, term, features], index) => {
            const highlighted = index === 2;
            const current = billing?.plan === name.toLowerCase();
            return (
              <div
                key={name}
                className={`relative rounded-2xl border p-6 text-left ${
                  highlighted ? "border-[#18324a] bg-[#18324a] text-white" : "border-[#ded8cb] bg-white text-[#102033]"
                }`}
              >
                {highlighted && <span className="absolute -top-3 rounded-full bg-[#f7f4ed] px-3 py-1 text-xs font-semibold text-[#18324a]">Most popular</span>}
                {current && <span className="absolute right-5 top-5 rounded-full bg-[#f1eee8] px-3 py-1 text-xs font-semibold text-[#18324a]">Current plan</span>}
                <h2 className="pr-24 text-lg font-semibold">{name}</h2>
                <p className="mt-4 text-4xl font-semibold">{price}</p>
                <p className={`mt-1 text-sm ${highlighted ? "text-slate-200" : "text-slate-500"}`}>{term}</p>
                <Button
                  onClick={() => checkout(name)}
                  disabled={loading === name || current}
                  className={`mt-6 w-full ${
                    highlighted ? "bg-white text-[#18324a] hover:bg-[#f1eee8]" : "bg-[#18324a] text-white hover:bg-[#102033]"
                  }`}
                >
                  {current ? "Current plan" : loading === name ? "Opening checkout..." : `Choose ${name}`}
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
