import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type ProscanPlan = "free" | "personal" | "business" | "agency";
export type ProscanStatus = "active" | "inactive" | "incomplete" | string;

function getResetAtISO(now = new Date()) {
  const resetAt = new Date(now);
  // next UTC midnight
  resetAt.setUTCHours(24, 0, 0, 0);
  return resetAt.toISOString();
}

export function getSupabaseAdmin(): SupabaseClient {
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
 * Plan → daily Pro Scan limits (overridable via env).
 * These match what you already set in .env.local / Vercel:
 *  - PROSCAN_LIMIT_FREE
 *  - PROSCAN_LIMIT_PERSONAL
 *  - PROSCAN_LIMIT_BUSINESS
 *  - PROSCAN_LIMIT_AGENCY
 */
export function getPlanLimits() {
  return {
    free: Number(process.env.PROSCAN_LIMIT_FREE ?? 0),
    personal: Number(process.env.PROSCAN_LIMIT_PERSONAL ?? 3),
    business: Number(process.env.PROSCAN_LIMIT_BUSINESS ?? 15),
    agency: Number(process.env.PROSCAN_LIMIT_AGENCY ?? 40),
  } as const;
}

export function computePlanLimit(planRaw: string | null | undefined, status: ProscanStatus) {
  const limits = getPlanLimits();
  const plan = ((planRaw || "free") as string).toLowerCase() as ProscanPlan;

  // Only ACTIVE paid subs get quota; otherwise treat as free
  const isActive = status === "active";
  if (!isActive || plan === "free") return limits.free;

  return limits[plan] ?? limits.free;
}

/**
 * Reads subscription from proscan_subscriptions for a user.
 * Returns { plan, status } with safe fallbacks.
 */
export async function getUserSubscription(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<{ plan: ProscanPlan; status: ProscanStatus }> {
  let plan: ProscanPlan = "free";
  let status: ProscanStatus = "inactive";

  try {
    const { data: sub } = await supabaseAdmin
      .from("proscan_subscriptions")
      .select("plan,status")
      .eq("user_id", userId)
      .maybeSingle();

    if (sub) {
      plan = ((sub.plan || plan) as string).toLowerCase() as ProscanPlan;
      status = sub.status || status;
    }
  } catch {
    // ignore schema/table issues
  }

  return { plan, status };
}

/**
 * Consumes 1 quota "token" from proscan_usage for today.
 * This is what you call BEFORE you do an expensive operation (Browserless/OpenAI).
 */
export async function consumeDailyQuota(
  supabaseAdmin: SupabaseClient,
  userId: string,
  limit: number,
) {
  const now = new Date();
  const resetAtISO = getResetAtISO(now);

  let usedToday = 0;

  try {
    const { data: usage } = await supabaseAdmin
      .from("proscan_usage")
      .select("used_today, reset_at")
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

    const remaining = Math.max(limit - usedToday, 0);

    if (remaining <= 0) {
      return {
        ok: false as const,
        limit,
        usedToday,
        remaining: 0,
        resetAt: resetAtISO,
      };
    }

    // reserve slot immediately
    await supabaseAdmin.from("proscan_usage").upsert({
      user_id: userId,
      used_today: usedToday + 1,
      limit,
      reset_at: resetAtISO,
    });

    return {
      ok: true as const,
      limit,
      usedToday: usedToday + 1,
      remaining: Math.max(limit - (usedToday + 1), 0),
      resetAt: resetAtISO,
    };
  } catch {
    // If table is missing, fail open (no quota enforced)
    return {
      ok: true as const,
      limit,
      usedToday,
      remaining: Math.max(limit - usedToday, 0),
      resetAt: resetAtISO,
      skipped: true as const,
    };
  }
}
