import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getBillingStatus, getStripe } from "@/lib/billing";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage billing." }, { status: 401 });

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Stripe is not configured." }, { status: 400 });

  const billing = await getBillingStatus(user.id);
  if (!billing.stripeCustomerId) return NextResponse.json({ error: "No Stripe customer exists for this account yet." }, { status: 404 });

  const origin = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "http://localhost:3000";
  const session = await stripe.billingPortal.sessions.create({
    customer: billing.stripeCustomerId,
    return_url: `${origin}/dashboard`,
  });

  return NextResponse.json({ url: session.url });
}
