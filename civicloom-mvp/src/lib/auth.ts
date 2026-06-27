import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { auth } from "@/auth";
import { getDbPool } from "@/lib/db";

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
};

export const authCookieName = "civicloom_session";

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is required in production.");
  }
  return new TextEncoder().encode(secret || "dev-only-civicloom-auth-secret-change-me");
}

export async function ensureAuthSchema() {
  const db = getDbPool();
  if (!db) return false;

  try {
    await db.execute("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL AFTER name");
  } catch (error) {
    const err = error as { code?: string };
    if (err.code !== "ER_DUP_FIELDNAME") throw error;
  }

  return true;
}

export async function createSession(user: AuthUser) {
  const token = await new SignJWT({ email: user.email, name: user.name || null })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getAuthSecret());

  const cookieStore = await cookies();
  cookieStore.set(authCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(authCookieName);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await auth();
  if (session?.user?.email) {
    return {
      id: session.user.id || "",
      email: session.user.email,
      name: session.user.name || null,
    };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(authCookieName)?.value;
  if (!token) return null;

  try {
    const verified = await jwtVerify(token, getAuthSecret());
    return {
      id: verified.payload.sub || "",
      email: String(verified.payload.email || ""),
      name: verified.payload.name ? String(verified.payload.name) : null,
    };
  } catch {
    return null;
  }
}
