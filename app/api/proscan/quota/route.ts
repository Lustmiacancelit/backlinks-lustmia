import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Demo user (falmeida)
const DEMO_USER_ID = "9b7e2a2a-7f2f-4f6a-9d9e-falmeida000001";

// Emails that should always get "agency / active" ProScan access
const ADMIN_TEST_EMAILS = ["sales@lustmia.com"];

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
      "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY",
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
    const supabaseAdmin = getSupabaseAdmin();
    const supabaseAuth = createSupabaseServer();
    const { searchParams } = new URL(req.url);

    // -----------------------------
    // 0) Identify logged-in user (via Supabase cookie)
    // -----------------------------
    let authedEmail: string | null = null;
    try {
      const { data } = await supabaseAuth.auth.getUser();
      authedEmail = data.user?.email?.toLowerCase() ?? null;
    } catch {
      authedEmail = null;
    }

    const isAdminTester =
      !!authedEmail && ADMIN_TEST_EMAILS.includes(authedEmail);

    // If no user ID is passed, use demo user OR a special admin ID
    const userIdParam = searchParams.get("u");
    const userId =
      userIdParam || (isAdminTester ? `admin-${authedEmail}` : DEMO_USER_ID);

    let usedToday = 0;
    let plan = "free"; // "free" | "personal" | "business" | "agency"
    let status = "inactive"; // "active" | "incomplete" | etc.
    let resetAtISO: string | null = null;

    // -----------------------------
    // 1) Read subscription (if exists) UNLESS we're admin test
    // -----------------------------
    if (isAdminTester) {
      // Force highest tier for admin test account
      plan = "agency";
      status = "active";
    } else {
      try {
        const { data: sub } = await supabaseAdmin
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
    }

    const limit = isAdminTester
      ? PLAN_LIMITS.agency
      : computePlanLimit(plan, status);

    const isPaidActive =
      isAdminTester || (status === "active" && plan !== "free");

    // -----------------------------
    // 2) Read / upsert usage today
    // -----------------------------
    try {
      const now = new Date();
      const resetAt = new Date(now);
      // Reset at next UTC midnight
      resetAt.setUTCHours(24, 0, 0, 0);
      resetAtISO = resetAt.toISOString();

      const { data: usage } = await supabaseAdmin
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
      await supabaseAdmin.from("proscan_usage").upsert({
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
      email: authedEmail,
      plan, // "free" | "personal" | "business" | "agency"
      status, // Billing status from proscan_subscriptions
      limit, // Daily Pro Scan limit for this tier
      usedToday,
      remaining,
      resetAt: resetAtISO,
      isPro: isPaidActive,
      demoUser: userId === DEMO_USER_ID,
      adminTester: isAdminTester,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Quota check failed" },
      { status: 500 },
    );
  }
}
