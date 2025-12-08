import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";

type ScanRequest = {
  url: string;
  userId: string;
};

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

    if (!body?.url || !body?.userId) {
      return NextResponse.json(
        { error: "Missing url or userId" },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const target = normalizeUrl(body.url);
    const userId = body.userId;

    // -----------------------------
    // QUOTA CHECK (if table exists)
    // -----------------------------
    let remaining: number | null = null;
    let limit: number | null = null;
    let resetAt: Date | null = null;

    try {
      limit = Number(process.env.PROSCAN_DAILY_LIMIT || 3);
      const today = new Date();
      const reset = new Date(today);
      reset.setUTCHours(24, 0, 0, 0);

      resetAt = reset;

      const { data: usage } = await supabaseAdmin
        .from("proscan_usage")
        .select("*")
        .eq("user_id", userId)
        .single();

      const usedToday =
        usage?.used_today && usage?.reset_at
          ? new Date(usage.reset_at) > today
            ? usage.used_today
            : 0
          : 0;

      remaining = Math.max(limit - usedToday, 0);

      if (remaining <= 0) {
        return NextResponse.json(
          {
            error: "Daily pro scan limit reached",
            limit,
            remaining: 0,
            resetAt,
          },
          { status: 429 }
        );
      }

      // Update usage immediately (reserve slot)
      await supabaseAdmin.from("proscan_usage").upsert({
        user_id: userId,
        used_today: usedToday + 1,
        limit,
        reset_at: resetAt.toISOString(),
      });
    } catch {
      // If proscan_usage doesn't exist yet, just skip quota
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
      resetAt: resetAt?.toISOString() ?? null,
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
        error: friendly, // 👈 show this to the user
        technical: e?.message || "Pro scan failed", // 👈 keep for debugging/logs
      },
      { status: 500 }
    );
  }
}
