import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
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
        { error: "Missing user id" },
        { status: 400 }
      );
    }

    const limit = Number(process.env.PROSCAN_DAILY_LIMIT || 3);

    // Default quota response (works even if tables aren't ready)
    let usedToday = 0;
    let plan = "free";
    let status = "inactive";

    // 1) Check subscription (if table exists)
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
      // ignore if table doesn't exist yet
    }

    // 2) Check usage today (if table exists)
    let resetAtISO: string | null = null;
    try {
      const today = new Date();
      const resetAt = new Date(today);
      resetAt.setUTCHours(24, 0, 0, 0);
      resetAtISO = resetAt.toISOString();

      const { data: usage } = await supabase
        .from("proscan_usage")
        .select("used_today, reset_at, limit")
        .eq("user_id", userId)
        .maybeSingle();

      if (usage) {
        const resetAtDb = usage.reset_at ? new Date(usage.reset_at) : null;

        // If reset_at is still in the future, count usage. Otherwise reset to 0.
        if (resetAtDb && resetAtDb > today) {
          usedToday = usage.used_today || 0;
        } else {
          usedToday = 0;
        }
      }

      // Ensure row exists (optional, safe)
      await supabase.from("proscan_usage").upsert({
        user_id: userId,
        used_today: usedToday,
        limit,
        reset_at: resetAtISO,
      });
    } catch {
      // ignore if usage table doesn't exist yet
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
