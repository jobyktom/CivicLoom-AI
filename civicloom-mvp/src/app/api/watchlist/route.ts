import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { addWatchlistLocation, listWatchlist } from "@/lib/value-add";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ watchlist: [], authenticated: false });

  const watchlist = await listWatchlist(user);
  return NextResponse.json({ watchlist, authenticated: true });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to save a watchlist location." }, { status: 401 });

  const body = await request.json();
  const businessType = String(body.businessType || "").trim();
  const locationName = String(body.locationName || "").trim();
  if (!businessType || !locationName) return NextResponse.json({ error: "Business type and location are required." }, { status: 400 });

  const id = await addWatchlistLocation(user, {
    businessType,
    locationName,
    geographyType: body.geographyType,
    stateCode: body.stateCode,
    countyCode: body.countyCode,
    placeCode: body.placeCode,
    lastScore: typeof body.lastScore === "number" ? body.lastScore : null,
  });

  return NextResponse.json({ id });
}
