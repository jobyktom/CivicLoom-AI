import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ensureAuthSchema } from "@/lib/auth";
import { getDatabaseErrorMessage, getDbPool } from "@/lib/db";
import { getPrismaClient } from "@/lib/prisma";

export async function POST(request: Request) {
  const db = getDbPool();
  const prisma = getPrismaClient();
  if (!db || !prisma) return NextResponse.json({ error: "Database is not configured." }, { status: 500 });

  try {
    await ensureAuthSchema(db);
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim() || null;
    const password = String(body.password || "");

    if (!email || !email.includes("@")) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 });

    const id = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: {
        id,
        email,
        name,
        passwordHash,
      },
    });

    const user = { id, email, name };
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Signup failed", error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}
