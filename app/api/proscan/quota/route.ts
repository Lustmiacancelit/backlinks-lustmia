import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabaseAdmin() {
  // Fallback so you don’t get trapped by naming mismatches
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY; // fallback if old name exists

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(url, key);
}

export async function GET(req: Request) {
  try {
    const supabase = getSupabaseAdmin();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("u");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing user id (?u=...)" },
        { status: 400 }
      );
    }

    const limit = Number(process.env.PROSCAN_DAILY_LIMIT || 3);

    // Defaults so quota works even if tables are empty
    let usedToday = 0;
    let plan = "free";
    let status = "inactive";

    // -----------------------------
    // 1) Subscription check
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
      // If table doesn't exist yet, ignore
    }

    // -----------------------------
    // 2) Usage check
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

        // If reset_at is still in the future, count usage; otherwise reset to 0
        if (resetAtDb && resetAtDb > now) {
          usedToday = usage.used_today || 0;
        } else {
          usedToday = 0;
        }
      }

      // Ensure row exists (safe upsert)
      await supabase.from("proscan_usage").upsert({
        user_id: userId,
        used_today: usedToday,
        limit,
        reset_at: resetAtISO,
      });
    } catch {
      // If usage table doesn't exist yet, ignore
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
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Quota check failed" },
      { status: 500 }
    );
  }
}
