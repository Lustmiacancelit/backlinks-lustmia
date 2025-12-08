import { NextResponse } from "next/server";

export async function GET() {
  console.log("Cron job triggered: backlink index update");
  return NextResponse.json({ ok: true });
}
