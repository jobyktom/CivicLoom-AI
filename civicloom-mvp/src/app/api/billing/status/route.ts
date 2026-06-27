import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getBillingStatus } from "@/lib/billing";

export async function GET() {
  const user = await getCurrentUser();
  const billing = await getBillingStatus(user?.id);

  return NextResponse.json({ billing, authenticated: Boolean(user) });
}
