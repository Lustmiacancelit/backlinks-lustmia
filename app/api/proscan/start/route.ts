import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ScanRequest = {
  url: string;
  userId?: string; // optional because we can derive from cookie auth
};

// ONLY this email should be master/admin
const ADMIN_EMAIL = "sales@lustmia.com";
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

  return createClient(url, key, { auth: { persistSession: false } });
}

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

function normalizeUrl(input: string) {
  const u = new URL(input.trim());
  if (!u.protocol.startsWith("http")) u.protocol = "https:";
  u.hash = "";
  return u.toString();
}

function mapProScanErrorToMessage(err: any): string {
  const raw = String(err?.message || "").toLowerCase();

  if (
    raw.includes("403") ||
    raw.includes("forbidden") ||
    raw.includes("access denied") ||
    raw.includes("blocked") ||
    raw.includes("captcha") ||
    raw.includes("cloudflare") ||
    raw.includes("akamai") ||
    raw.includes("bot detected") ||
    raw.includes("protected") ||
    raw.includes("not allowed")
  ) {
    return "This website is protected by its hosting or DNS provider and cannot be scanned due to security restrictions.";
  }

  return "The pro scan could not be completed. Please try again with a different site or try again later.";
}

async function fetchRenderedHTML(targetUrl: string) {
  const token = process.env.BROWSERLESS_TOKEN;
  if (!token) throw new Error("Missing BROWSERLESS_TOKEN");

  const endpoint = `https://chrome.browserless.io/content?token=${token}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent":
        process.env.SCRAPER_USER_AGENT ||
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    },
    body: JSON.stringify({
      url: targetUrl,
      waitUntil: "networkidle2",
      gotoOptions: { timeout: Number(process.env.SCRAPER_TIMEOUT || 10000) },
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Browserless error: ${res.status} ${txt}`);
  }

  return res.text();
}

function extractOutboundLinks(html: string, baseUrl: string) {
  const $ = cheerio.load(html);
  const links = new Set<string>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      const abs = new URL(href, baseUrl).toString();
      if (abs.startsWith("http")) links.add(abs);
    } catch {
      // ignore bad urls
    }
  });

  return Array.from(links);
}

function uniqueRefDomains(links: string[], targetHost: string) {
  const domains = new Set<string>();
  for (const l of links) {
    try {
      const h = new URL(l).hostname.replace(/^www\./, "");
      if (h && h !== targetHost) domains.add(h);
    } catch {
      // ignore bad urls
    }
  }
  return Array.from(domains);
}

async function reserveDailyToken(params: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>;
  userId: string;
  limit: number;
}) {
  const { supabaseAdmin, userId, limit } = params;

  const now = new Date();
  const resetAtISO = nextUtcMidnightISO();

  let usedToday = 0;

  const { data: usage } = await supabaseAdmin
    .from("proscan_usage")
    .select("used_today, reset_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (usage) {
    const resetAtDb = usage.reset_at ? new Date(usage.reset_at) : null;
    if (resetAtDb && resetAtDb > now) usedToday = usage.used_today || 0;
    else usedToday = 0;
  }

  await supabaseAdmin.from("proscan_usage").upsert({
    user_id: userId,
    used_today: usedToday,
    limit,
    reset_at: resetAtISO,
  });

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

  await supabaseAdmin.from("proscan_usage").upsert({
    user_id: userId,
    used_today: usedToday + 1,
    limit,
    reset_at: resetAtISO,
  });

  return {
    ok: true as const,
    limit,
    usedTodayBefore: usedToday,
    usedTodayAfter: usedToday + 1,
    remainingAfter: Math.max(limit - (usedToday + 1), 0),
    resetAt: resetAtISO,
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as ScanRequest | null;

    if (!body?.url) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    const supabaseAuth = createSupabaseServer();
    const { data: authData } = await supabaseAuth.auth.getUser();
    const authedUser = authData?.user ?? null;

    const authedEmail = (authedUser?.email ?? "").toLowerCase();
    const isAdmin = authedEmail === ADMIN_EMAIL;

    const supabaseAdmin = getSupabaseAdmin();

    const target = normalizeUrl(body.url);

    // Prefer real authed user id when logged in; fallback to body.userId if not
    const effectiveUserId =
      isAdmin
        ? `admin-${ADMIN_EMAIL}`
        : authedUser?.id || body.userId || null;

    if (!effectiveUserId) {
      return NextResponse.json(
        { error: "Missing userId (not authenticated)" },
        { status: 401 }
      );
    }

    // -----------------------------
    // ADMIN SHORT-CIRCUIT (no quota/subscription)
    // -----------------------------
    if (isAdmin) {
      const html = await fetchRenderedHTML(target);
      const outboundLinks = extractOutboundLinks(html, target);

      const targetHost = new URL(target).hostname.replace(/^www\./, "");
      const refDomains = uniqueRefDomains(outboundLinks, targetHost);

      const result = {
        target,
        totalBacklinks: outboundLinks.length,
        refDomains: refDomains.length,
        sample: outboundLinks.slice(0, 25),
        limit: ADMIN_DAILY_LIMIT,
        remaining: ADMIN_DAILY_LIMIT,
        resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      // Store scan (best effort)
      try {
        await supabaseAdmin.from("proscan_scans").insert({
          user_id: effectiveUserId,
          target,
          total_backlinks: result.totalBacklinks,
          ref_domains: result.refDomains,
          sample: result.sample,
          created_at: new Date().toISOString(),
        });
      } catch {
        // ignore
      }

      return NextResponse.json(result);
    }

    // -----------------------------
    // NORMAL USERS: subscription + quota
    // -----------------------------
    let plan = "free";
    let status = "inactive";

    try {
      const { data: sub } = await supabaseAdmin
        .from("proscan_subscriptions")
        .select("plan_id,status")
        .eq("user_id", effectiveUserId)
        .maybeSingle();

      if (sub) {
        plan = String(sub.plan_id || plan).toLowerCase();
        status = sub.status || status;
      }
    } catch {
      plan = "free";
      status = "inactive";
    }

    const isPaidActive = status === "active" && plan !== "free";
    if (!isPaidActive) {
      return NextResponse.json(
        { error: "Upgrade required to run Pro scans." },
        { status: 402 }
      );
    }

    const limit = computePlanLimit(plan, status);
    if (!Number.isFinite(limit) || limit <= 0) {
      return NextResponse.json(
        { error: "Pro scan quota is not available for your plan." },
        { status: 403 }
      );
    }

    const reservation = await reserveDailyToken({
      supabaseAdmin,
      userId: effectiveUserId,
      limit,
    });

    if (!reservation.ok) {
      return NextResponse.json(
        {
          error: "Daily pro scan limit reached",
          limit: reservation.limit,
          remaining: 0,
          resetAt: reservation.resetAt,
        },
        { status: 429 }
      );
    }

    // -----------------------------
    // FETCH + PARSE
    // -----------------------------
    const html = await fetchRenderedHTML(target);
    const outboundLinks = extractOutboundLinks(html, target);

    const targetHost = new URL(target).hostname.replace(/^www\./, "");
    const refDomains = uniqueRefDomains(outboundLinks, targetHost);

    const result = {
      target,
      totalBacklinks: outboundLinks.length,
      refDomains: refDomains.length,
      sample: outboundLinks.slice(0, 25),
      limit: reservation.limit,
      remaining: reservation.remainingAfter,
      resetAt: reservation.resetAt,
    };

    // -----------------------------
    // STORE SCAN (best-effort)
    // -----------------------------
    try {
      await supabaseAdmin.from("proscan_scans").insert({
        user_id: effectiveUserId,
        target,
        total_backlinks: result.totalBacklinks,
        ref_domains: result.refDomains,
        sample: result.sample,
        created_at: new Date().toISOString(),
      });
    } catch {
      // ignore
    }

    return NextResponse.json(result);
  } catch (e: any) {
    console.error("Pro scan failed:", e);

    const friendly = mapProScanErrorToMessage(e);

    return NextResponse.json(
      {
        ok: false,
        error: friendly,
        technical: e?.message || "Pro scan failed",
      },
      { status: 500 }
    );
  }
}
