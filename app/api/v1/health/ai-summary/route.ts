import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * Admin Supabase client (service role) to bypass RLS.
 */
function getSupabaseAdmin() {
  const url =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE;

  if (!url || !key) {
    throw new Error(
      "Supabase admin not configured. Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // Support both ?target= and ?domain=
    const target = (searchParams.get("target") || searchParams.get("domain") || "").trim();
    if (!target) {
      return NextResponse.json({ error: "Missing target" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("site_health")
      .select("authority_trend, backlink_velocity, spam_risk, ai_summary, created_at")
      .eq("domain", target)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const authority = Number(data?.authority_trend ?? 0);
    const velocity = Number(data?.backlink_velocity ?? 0);
    const spamRisk = Number(data?.spam_risk ?? 0);

    return NextResponse.json({
      target,
      bars: {
        authority_trend: { value: authority, label: "Authority Trend" },
        backlink_velocity: { value: velocity, label: "Backlink Velocity" },
        spam_risk: { value: spamRisk, label: "Spam Risk" },
      },
      tip:
        typeof data?.ai_summary === "string" && data.ai_summary.trim()
          ? data.ai_summary
          : "Run Site Health to generate AI recommendations.",
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
