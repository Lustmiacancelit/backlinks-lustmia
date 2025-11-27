import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Demo user (falmeida)
const DEMO_USER_ID = "9b7e2a2a-7f2f-4f6a-9d9e-falmeida000001";

function getSupabaseAdmin() {
  // Prefer server env, fallback to NEXT_PUBLIC for safety
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

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

/**
 * Plan → daily Pro Scan limits.
 *
 * These defaults are chosen to be profitable:
 * - free:     0 Pro scans/day
 * - personal: 3 Pro scans/day   (~90 / month)
 * - business: 15 Pro scans/day  (~450 / month)
 * - agency:   40 Pro scans/day  (~1200 / month)
 *
 * You can override any of them via env vars without changing code:
 *  - PROSCAN_LIMIT_FREE
 *  - PROSCAN_LIMIT_PERSONAL
 *  - PROSCAN_LIMIT_BUSINESS
 *  - PROSCAN_LIMIT_AGENCY
 */
const PLAN_LIMITS: Record<string, number> = {
  free: Number(process.env.PROSCAN_LIMIT_FREE ?? 0),
  personal: Number(process.env.PROSCAN_LIMIT_PERSONAL ?? 3),
  business: Number(process.env.PROSCAN_LIMIT_BUSINESS ?? 15),
  agency: Number(process.env.PROSCAN_LIMIT_AGENCY ?? 40),
};

function computePlanLimit(planRaw: string | null | undefined, status: string) {
  const plan = (planRaw || "free").toLowerCase();

  // Only ACTIVE paid subs get Pro scans; everyone else is effectively "free"
  const isActive = status === "active";
  if (!isActive || plan === "free") {
    return PLAN_LIMITS.free;
  }

  // If we somehow get an unknown plan string, fall back to free
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

export async function GET(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);

    // If no user ID is passed, use demo user falmeida
    const userId = searchParams.get("u") || DEMO_USER_ID;

    let usedToday = 0;
    let plan = "free";         // "free" | "personal" | "business" | "agency"
    let status = "inactive";   // "active" | "incomplete" | etc.

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
        plan = (sub.plan || plan).toLowerCase();
        status = sub.status || status;
      }
    } catch {
      // ignore missing table / schema mismatch
    }

    const limit = computePlanLimit(plan, status);
    const isPaidActive = status === "active" && plan !== "free";

    // -----------------------------
    // 2) Read / upsert usage today
    // -----------------------------
    let resetAtISO: string | null = null;

    try {
      const now = new Date();
      const resetAt = new Date(now);
      // Reset at next UTC midnight
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
          // window expired → reset
          usedToday = 0;
        }
      }

      // Keep row in sync with the correct limit + resetAt
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
      plan,              // "free" | "personal" | "business" | "agency"
      status,            // Billing status from proscan_subscriptions
      limit,             // Daily Pro Scan limit for this tier
      usedToday,
      remaining,
      resetAt: resetAtISO,
      isPro: isPaidActive,
      demoUser: userId === DEMO_USER_ID,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Quota check failed" },
      { status: 500 }
    );
  }
}
