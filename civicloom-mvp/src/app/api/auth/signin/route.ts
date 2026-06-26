import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSession, ensureAuthSchema } from "@/lib/auth";
import { getDatabaseErrorMessage, getDbPool } from "@/lib/db";

type UserRow = { id: string; email: string; name: string | null; password_hash: string | null };

export async function POST(request: Request) {
  const db = getDbPool();
  if (!db) return NextResponse.json({ error: "Database is not configured." }, { status: 500 });

  try {
    await ensureAuthSchema(db);
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    const [rows] = await db.execute("SELECT id,email,name,password_hash FROM users WHERE email = ? LIMIT 1", [email]);
    const user = (rows as UserRow[])[0];
    const valid = user?.password_hash ? await bcrypt.compare(password, user.password_hash) : false;

    if (!user || !valid) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    await createSession({ id: user.id, email: user.email, name: user.name });
    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    console.error("Signin failed", error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}

