import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSession, ensureAuthSchema } from "@/lib/auth";
import { getDatabaseErrorMessage, getDbPool } from "@/lib/db";

type UserRow = { id: string; email: string; name: string | null };

export async function POST(request: Request) {
  const db = getDbPool();
  if (!db) return NextResponse.json({ error: "Database is not configured." }, { status: 500 });

  try {
    await ensureAuthSchema(db);
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim() || null;
    const password = String(body.password || "");

    if (!email || !email.includes("@")) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

    const [existing] = await db.execute("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
    if ((existing as UserRow[]).length) return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 });

    const id = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 12);
    await db.execute("INSERT INTO users (id,email,name,password_hash) VALUES (?,?,?,?)", [id, email, name, passwordHash]);

    const user = { id, email, name };
    await createSession(user);
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Signup failed", error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}

