import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Upsert sweep settings for a user.
 * NOTE: We trust the userId sent from the client here. For a broader launch
 * you’d want to verify this with Supabase auth cookies.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, enabled, domain, cadenceDays } = body || {};

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId" },
        { status: 400 },
      );
    }

    if (!domain || typeof domain !== "string") {
      return NextResponse.json(
        { error: "Missing domain" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("toxic_sweep_settings")
      .upsert(
        {
          user_id: userId,
          domain,
          enabled: !!enabled,
          cadence_days: cadenceDays ?? 30,
        },
        { onConflict: "user_id" }, // requires PG 15+, otherwise remove
      );

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to save sweep settings" },
      { status: 500 },
    );
  }
}
