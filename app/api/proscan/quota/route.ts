import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Demo user (falmeida)
const DEMO_USER_ID = "9b7e2a2a-7f2f-4f6a-9d9e-falmeida000001";

function getSupabaseAdmin() {
  // Prefer server env, fallback to NEXT_PUBLIC for safety
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Prefer correct service role key name, fallback to older one if present
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

export async function GET(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);

    // If no user ID is passed, use demo user falmeida
    let userId = searchParams.get("u") || DEMO_USER_ID;

    const limit = Number(process.env.PROSCAN_DAILY_LIMIT || 3);

    // Defaults
    let usedToday = 0;
    let plan = "free";
    let status = "inactive";

    // -----------------------------
    // 1) Read subscription (if exists)
    // -----------------------------
    try {
      const { data: sub } = await supabase
        .from("proscan_subscriptions")
        .select("plan,status,current_period_end")
        .eq("user_id", userId)
        .maybeSingle();

      if (sub) {
        plan = sub.plan || plan;
        status = sub.status || status;
      }
    } catch {
      // ignore missing table / schema mismatch
    }

    // -----------------------------
    // 2) Read usage today (if exists)
    // -----------------------------
    let resetAtISO: string | null = null;

    try {
      const now = new Date();
      const resetAt = new Date(now);
      resetAt.setUTCHours(24, 0, 0, 0);
      resetAtISO = resetAt.toISOString();

      const { data: usage } = await supabase
        .from("proscan_usage")
        .select("used_today, reset_at, limit")
        .eq("user_id", userId)
        .maybeSingle();

      if (usage) {
        const resetAtDb = usage.reset_at ? new Date(usage.reset_at) : null;

        if (resetAtDb && resetAtDb > now) {
          usedToday = usage.used_today || 0;
        } else {
          usedToday = 0;
        }
      }

      // Ensure row exists / stays correct
      await supabase.from("proscan_usage").upsert({
        user_id: userId,
        used_today: usedToday,
        limit,
        reset_at: resetAtISO,
      });
    } catch {
      // ignore missing usage table
    }

    const remaining = Math.max(limit - usedToday, 0);

    return NextResponse.json({
      userId,
      plan,
      status,
      limit,
      usedToday,
      remaining,
      resetAt: resetAtISO,
      isPro: status === "active",
      demoUser: userId === DEMO_USER_ID,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Quota check failed" },
      { status: 500 }
    );
  }
}
