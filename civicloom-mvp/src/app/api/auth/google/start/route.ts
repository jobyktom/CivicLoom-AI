import { NextResponse } from "next/server";
import { signIn } from "@/auth";

async function startGoogleSignIn() {
  const redirectUrl = await signIn("google", {
    redirect: false,
    redirectTo: "/dashboard",
  });

  return NextResponse.redirect(redirectUrl);
}

export async function GET() {
  return startGoogleSignIn();
}

export async function POST() {
  return startGoogleSignIn();
}
