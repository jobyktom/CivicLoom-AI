import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { removeWatchlistLocation } from "@/lib/value-add";

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage your watchlist." }, { status: 401 });

  const { id } = await params;
  await removeWatchlistLocation(user, id);
  return NextResponse.json({ ok: true });
}
