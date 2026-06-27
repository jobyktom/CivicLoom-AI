import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateStripeCustomer, getPriceId, getStripe, normalizePlan, planConfigs } from "@/lib/billing";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in before choosing a paid plan." }, { status: 401 });

  const { plan: rawPlan } = await request.json();
  const plan = normalizePlan(rawPlan);
  if (plan === "free") return NextResponse.json({ url: "/report/new" });

  const stripe = getStripe();
  const price = getPriceId(plan);
  if (!stripe || !price) {
    return NextResponse.json({ error: "Stripe is not configured for this plan yet." }, { status: 400 });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "http://localhost:3000";
  const customer = await getOrCreateStripeCustomer(user);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [{ price, quantity: 1 }],
    success_url: `${origin}/dashboard?checkout=success`,
    cancel_url: `${origin}/pricing?checkout=cancelled`,
    allow_promotion_codes: true,
    client_reference_id: user.id,
    subscription_data: {
      metadata: {
        userId: user.id,
        plan,
      },
    },
    metadata: {
      userId: user.id,
      plan,
      reportLimit: String(planConfigs[plan].reportLimit),
    },
  });

  return NextResponse.json({ url: session.url });
}
