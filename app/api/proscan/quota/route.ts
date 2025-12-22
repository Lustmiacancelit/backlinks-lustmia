import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Demo user (falmeida)
const DEMO_USER_ID = "9b7e2a2a-7f2f-4f6a-9d9e-falmeida000001";

// ONLY this email should be master/admin
const ADMIN_EMAIL = "sales@lustmia.com";

// For admin we return a huge daily limit so UI never gates
const ADMIN_DAILY_LIMIT = 999999;

function getSupabaseAdmin() {
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
 */
const PLAN_LIMITS: Record<string, number> = {
  free: Number(process.env.PROSCAN_LIMIT_FREE ?? 0),
  personal: Number(process.env.PROSCAN_LIMIT_PERSONAL ?? 3),
  business: Number(process.env.PROSCAN_LIMIT_BUSINESS ?? 15),
  agency: Number(process.env.PROSCAN_LIMIT_AGENCY ?? 40),
};

function computePlanLimit(planRaw: string | null | undefined, status: string) {
  const plan = (planRaw || "free").toLowerCase();
  const isActive = status === "active";
  if (!isActive || plan === "free") return PLAN_LIMITS.free;
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

function nextUtcMidnightISO() {
  const now = new Date();
  const resetAt = new Date(now);
  resetAt.setUTCHours(24, 0, 0, 0);
  return resetAt.toISOString();
}

/** ---------- Fallback helpers (subdomain/cookie reliability) ---------- */

function parseCookieHeader(cookieHeader: string | null) {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;

  const parts = cookieHeader.split(";").map((p) => p.trim());
  for (const p of parts) {
    const idx = p.indexOf("=");
    if (idx === -1) continue;
    const k = p.slice(0, idx).trim();
    const v = p.slice(idx + 1).trim();
    out[k] = v;
  }
  return out;
}

function base64UrlDecodeToString(input: string) {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
  return Buffer.from(b64 + pad, "base64").toString("utf8");
}

function tryDecodeJwtEmail(accessToken?: string | null) {
  if (!accessToken) return null;
  const parts = accessToken.split(".");
  if (parts.length < 2) return null;

  try {
    const payloadJson = base64UrlDecodeToString(parts[1]);
    const payload = JSON.parse(payloadJson);
    const email =
      (payload?.email as string | undefined) ||
      (payload?.user_email as string | undefined) ||
      null;
    return email ? email.toLowerCase() : null;
  } catch {
    return null;
  }
}

/**
 * Attempts to read the Supabase auth cookie created by auth-helpers:
 * often named like: sb-<project-ref>-auth-token
 */
function tryGetEmailFromSupabaseCookie(req: Request) {
  const cookieHeader = req.headers.get("cookie");
  const cookies = parseCookieHeader(cookieHeader);

  const authCookieKey = Object.keys(cookies).find(
    (k) => k.startsWith("sb-") && k.endsWith("-auth-token")
  );

  if (!authCookieKey) return null;

  const raw = cookies[authCookieKey];
  if (!raw) return null;

  try {
    const decoded = decodeURIComponent(raw);

    // Try JSON parse first.
    try {
      const parsed = JSON.parse(decoded);
      const emailFromUser = parsed?.user?.email ?? null;
      if (emailFromUser) return String(emailFromUser).toLowerCase();
      const token = parsed?.access_token ?? null;
      return tryDecodeJwtEmail(token);
    } catch {
      // Try base64 decode -> JSON
      const asString = Buffer.from(decoded, "base64").toString("utf8");
      const parsed = JSON.parse(asString);
      const emailFromUser = parsed?.user?.email ?? null;
      if (emailFromUser) return String(emailFromUser).toLowerCase();
      const token = parsed?.access_token ?? null;
      return tryDecodeJwtEmail(token);
    }
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const supabaseAuth = createSupabaseServer();
    const { searchParams } = new URL(req.url);

    // -----------------------------
    // 0) Identify logged-in user (cookie auth is source of truth)
    // -----------------------------
    let authedEmail: string | null = null;
    let authedUserId: string | null = null;

    try {
      const { data } = await supabaseAuth.auth.getUser();
      authedEmail = data?.user?.email?.toLowerCase() ?? null;
      authedUserId = data?.user?.id ?? null;
    } catch {
      authedEmail = null;
      authedUserId = null;
    }

    // Fallback: read Supabase auth cookie directly and extract email
    // (NOTE: we cannot reliably extract userId from this fallback)
    if (!authedEmail) {
      authedEmail = tryGetEmailFromSupabaseCookie(req);
    }

    const isAdmin = authedEmail === ADMIN_EMAIL;

    // IMPORTANT:
    // - If user is authenticated, ALWAYS use authedUserId (ignore spoofable ?u=)
    // - If not authenticated, fall back to ?u= or demo id
    const userIdParam = searchParams.get("u");
    const userId = isAdmin
      ? `admin-${ADMIN_EMAIL}` // stable admin id (quota irrelevant)
      : authedUserId || userIdParam || DEMO_USER_ID;

    // -----------------------------
    // ADMIN SHORT-CIRCUIT
    // -----------------------------
    if (isAdmin) {
      return NextResponse.json({
        userId,
        email: authedEmail,
        plan: "agency",
        status: "active",
        limit: ADMIN_DAILY_LIMIT,
        usedToday: 0,
        remaining: ADMIN_DAILY_LIMIT,
        resetAt: nextUtcMidnightISO(),
        isPro: true,
        demoUser: false,
        adminTester: true,
      });
    }

    // -----------------------------
    // Normal users
    // -----------------------------
    let usedToday = 0;
    let plan = "free";
    let status = "inactive";
    let resetAtISO: string | null = null;

    // 1) Read subscription (if exists)
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

    const limit = computePlanLimit(plan, status);
    const isPaidActive = status === "active" && plan !== "free";

    // 2) Read / upsert usage today
    try {
      const now = new Date();
      resetAtISO = nextUtcMidnightISO();

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
          usedToday = 0;
        }
      }

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
      plan,
      status,
      limit,
      usedToday,
      remaining,
      resetAt: resetAtISO,
      isPro: isPaidActive,
      demoUser: userId === DEMO_USER_ID,
      adminTester: false,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Quota check failed" },
      { status: 500 }
    );
  }
}
