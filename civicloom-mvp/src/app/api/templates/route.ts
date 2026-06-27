import { NextResponse } from "next/server";
import { listBusinessTemplates } from "@/lib/value-add";

export async function GET() {
  const { templates, source } = await listBusinessTemplates();
  return NextResponse.json({ templates, source });
}
