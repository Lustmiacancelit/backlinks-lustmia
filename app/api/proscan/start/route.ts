// app/api/proscan/start/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // server-only key
);

// Simple GET so you can test in browser
export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/proscan/start",
    message: "ProScan start endpoint is live. Use POST to start a scan."
  });
}

// POST = actually consume quota and start scan
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, url } = body || {};

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }
    if (!url) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    // 1) Consume quota (uses your SQL function)
    // If your function name is different, change it here.
    const { data: quotaRow, error: quotaErr } = await supabase.rpc(
      "increment_proscan_usage",
      { p_user_id: userId, p_amount: 1 }
    );

    if (quotaErr) {
      // Your SQL raises PROSCAN_LIMIT_EXCEEDED
      if (quotaErr.message?.includes("PROSCAN_LIMIT_EXCEEDED")) {
        return NextResponse.json(
          { error: "PROSCAN_LIMIT_EXCEEDED" },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: quotaErr.message || "Quota error" },
        { status: 500 }
      );
    }

    // 2) Start scan (MVP placeholder)
    // Later you’ll call Browserless / crawler here.
    const jobId = crypto.randomUUID();

    return NextResponse.json({
      ok: true,
      jobId,
      quota: quotaRow,
      target: url,
      status: "started"
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
