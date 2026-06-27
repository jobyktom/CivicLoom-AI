import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";
import { signOut } from "@/auth";

export async function POST() {
  try {
    await signOut({ redirect: false });
  } catch {
    // Auth.js may throw a redirect response in some server contexts.
    // The legacy cookie is still cleared below for migration safety.
  }
  await clearSession();
  return NextResponse.json({ ok: true });
}
