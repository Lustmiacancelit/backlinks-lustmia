import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabase/server";

// ✅ reuse your shared quota + subscription logic
import {
  computePlanLimit,
  getSupabaseAdmin as getSupabaseAdminFromLib,
  getUserSubscription,
  consumeDailyQuota,
} from "@/lib/proscanQuota";

type ScanRequest = {
  url: string;
  userId: string;
};

// ONLY this email should be master/admin
const ADMIN_EMAIL = "sales@lustmia.com";

// For admin we return a huge daily limit so UI never gates
const ADMIN_DAILY_LIMIT = 999999;

function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, serviceKey);
}

function normalizeUrl(input: string) {
  const u = new URL(input.trim());
  if (!u.protocol.startsWith("http")) u.protocol = "https:";
  u.hash = "";
  return u.toString();
}

/**
 * Map low-level pro-scan errors into a friendly message
 * that you can show in the UI.
 */
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
      gotoOptions: {
        timeout: Number(process.env.SCRAPER_TIMEOUT || 10000),
      },
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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ScanRequest;

    if (!body?.url) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    // -----------------------------
    // AUTH (required for admin bypass)
    // -----------------------------
    let authedEmail: string | null = null;
    try {
      const supabaseAuth = createSupabaseServer();
      const { data } = await supabaseAuth.auth.getUser();
      authedEmail = data?.user?.email?.toLowerCase() ?? null;
    } catch {
      authedEmail = null;
    }

    const isAdmin = authedEmail === ADMIN_EMAIL;

    // For normal users, we still require userId from the client
    if (!isAdmin && !body?.userId) {
      return NextResponse.json(
        { error: "Missing userId" },
        { status: 400 }
      );
    }

    // Keep your existing admin client (not removing it)
    const supabaseAdmin = getSupabaseAdmin();

    // ✅ Shared helper admin client too (same envs, safe)
    const supabaseAdminLib = getSupabaseAdminFromLib();

    const target = normalizeUrl(body.url);

    // Use incoming userId for normal users
    // For admin, tie scans to a stable id (doesn't matter for quota because we skip it)
    const userId = isAdmin ? `admin-${ADMIN_EMAIL}` : body.userId;

    // -----------------------------
    // ADMIN SHORT-CIRCUIT:
    // skip subscription/quota checks and do NOT decrement usage
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
          user_id: userId,
          target,
          total_backlinks: result.totalBacklinks,
          ref_domains: result.refDomains,
          sample: result.sample,
          created_at: new Date().toISOString(),
        });
      } catch {
        // ignore if table doesn't exist
      }

      return NextResponse.json(result);
    }

    // -----------------------------
    // NORMAL USERS: QUOTA CHECK (plan-based + paid-only)
    // -----------------------------
    let remaining: number | null = null;
    let limit: number | null = null;
    let resetAt: string | null = null;

    try {
      // 1) subscription
      const { plan, status } = await getUserSubscription(
        supabaseAdminLib,
        userId
      );

      // 2) only paid active can run ProScan
      const isPaidActive = status === "active" && plan !== "free";
      if (!isPaidActive) {
        return NextResponse.json(
          { error: "Upgrade required to run Pro scans." },
          { status: 402 }
        );
      }

      // 3) per-plan limit
      limit = computePlanLimit(plan, status);

      // 4) consume quota BEFORE Browserless
      const q = await consumeDailyQuota(supabaseAdminLib, userId, limit);

      resetAt = q.resetAt ?? null;

      if (!q.ok) {
        return NextResponse.json(
          {
            error: "Daily pro scan limit reached",
            limit: q.limit,
            remaining: 0,
            resetAt: q.resetAt,
          },
          { status: 429 }
        );
      }

      remaining = q.remaining ?? null;
      limit = q.limit ?? limit;
    } catch {
      return NextResponse.json(
        { error: "Usage tracking unavailable. Please contact support." },
        { status: 503 }
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
      limit,
      remaining,
      resetAt,
    };

    // -----------------------------
    // STORE SCAN (if table exists)
    // -----------------------------
    try {
      await supabaseAdmin.from("proscan_scans").insert({
        user_id: userId,
        target,
        total_backlinks: result.totalBacklinks,
        ref_domains: result.refDomains,
        sample: result.sample,
        created_at: new Date().toISOString(),
      });
    } catch {
      // ignore if table doesn't exist
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
