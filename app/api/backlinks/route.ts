import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/* ============================================================
   TYPES
============================================================ */
type Mode = "mvp" | "pro";

type BacklinkResult = {
  target: string;
  totalBacklinks: number;
  refDomains: number;
  sample: string[];

  // Step C extras
  pagesCrawled: number;
  uniqueOutbound: number;
  linksDetailed: LinkDetail[];
  errors: string[];
};

type LinkDetail = {
  source_page: string;
  target_url: string;
  target_domain: string;
  anchor_text: string | null;
  rel: string | null;
  nofollow: boolean;
  sponsored: boolean;
  ugc: boolean;
  link_type: "editorial" | "directory" | "social" | "other";
};

/* ============================================================
   SUPABASE ADMIN CLIENT
============================================================ */
function getSupabaseAdmin() {
  const url =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase admin not configured. Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

/* ============================================================
   HELPERS
============================================================ */
function normalizeUrl(input: string) {
  const raw = (input || "").trim();
  if (!raw) return "";
  try {
    return new URL(raw).toString();
  } catch {
    return new URL("https://" + raw).toString();
  }
}

function getDomain(u: string) {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isProbablyHtml(url: string) {
  // skip obvious files
  return !/\.(pdf|jpg|jpeg|png|gif|webp|zip|rar|mp4|mp3|svg|css|js)$/i.test(url);
}

function classifyLink(targetUrl: string): LinkDetail["link_type"] {
  const d = getDomain(targetUrl);
  if (!d) return "other";
  if (
    d.includes("facebook.com") ||
    d.includes("instagram.com") ||
    d.includes("tiktok.com") ||
    d.includes("x.com") ||
    d.includes("twitter.com") ||
    d.includes("linkedin.com") ||
    d.includes("pinterest.com") ||
    d.includes("youtube.com")
  ) return "social";
  if (
    d.includes("directory") ||
    d.includes("listing") ||
    d.includes("yellowpages") ||
    d.includes("map") ||
    d.includes("wiki")
  ) return "directory";
  return "editorial";
}

/* ============================================================
   FETCH MVP
============================================================ */
async function fetchHtmlMvp(target: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  const res = await fetch(target, {
    method: "GET",
    redirect: "follow",
    signal: controller.signal,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      Referer: "https://www.google.com/",
    },
  });

  clearTimeout(timeout);

  if (!res.ok) {
    const err = new Error(`Request failed with status code ${res.status}`);
    (err as any).status = res.status;
    throw err;
  }

  return await res.text();
}

/* ============================================================
   FETCH PRO (Browserless Unblock)
============================================================ */
async function fetchHtmlPro(target: string) {
  const token = process.env.BROWSERLESS_TOKEN;
  if (!token) {
    throw new Error(
      "Pro Scan not configured. Missing BROWSERLESS_TOKEN env var."
    );
  }

  const endpoint = `https://production-sfo.browserless.io/unblock?token=${token}&proxy=residential`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: target,
      content: true,
    }),
  });

  if (!res.ok) {
    throw new Error(`Pro Scan failed with status code ${res.status}`);
  }

  const data = await res.json().catch(() => ({}));
  const html =
    data?.content ||
    data?.data?.content ||
    data?.html ||
    data?.body ||
    "";

  if (!html || typeof html !== "string") {
    throw new Error("Pro Scan returned empty HTML (site still protected).");
  }

  return html;
}

async function fetchHtml(target: string, mode: Mode) {
  try {
    return await fetchHtmlMvp(target);
  } catch (e: any) {
    if (
      mode === "pro" &&
      (e?.status === 403 || String(e?.message).includes("403"))
    ) {
      return await fetchHtmlPro(target);
    }
    throw e;
  }
}

/* ============================================================
   CRAWL ENGINE (depth + maxPages)
============================================================ */
async function crawlSite(
  startUrl: string,
  mode: Mode,
  depth = 1,
  maxPages = 8,
  maxOutbound = 200
) {
  const startDomain = getDomain(startUrl);
  const visited = new Set<string>();
  const queue: Array<{ url: string; d: number }> = [{ url: startUrl, d: 0 }];

  const outboundDetails: LinkDetail[] = [];
  const errors: string[] = [];

  while (queue.length && visited.size < maxPages) {
    const { url, d } = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);

    let html = "";
    try {
      html = await fetchHtml(url, mode);
    } catch (err: any) {
      errors.push(`${url}: ${err?.message || "fetch failed"}`);
      continue;
    }

    const $ = cheerio.load(html);

    // 1) collect internal links if depth allows
    if (d < depth) {
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;

        if (
          href.startsWith("#") ||
          href.startsWith("mailto:") ||
          href.startsWith("tel:") ||
          href.startsWith("javascript:")
        ) return;

        try {
          const abs = new URL(href, url).toString();
          const dom = getDomain(abs);
          if (dom === startDomain && isProbablyHtml(abs)) {
            if (!visited.has(abs)) {
              queue.push({ url: abs, d: d + 1 });
            }
          }
        } catch {}
      });
    }

    // 2) extract outbound links on this page
    $("a[href]").each((_, el) => {
      if (outboundDetails.length >= maxOutbound) return;

      const href = $(el).attr("href");
      if (!href) return;

      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:")
      ) return;

      try {
        const abs = new URL(href, url).toString();
        const dom = getDomain(abs);
        if (!dom || dom === startDomain) return;

        const anchor = $(el).text().trim() || null;
        const rel = ($(el).attr("rel") || "").toLowerCase() || null;

        const nofollow = !!rel?.includes("nofollow");
        const sponsored = !!rel?.includes("sponsored");
        const ugc = !!rel?.includes("ugc");

        outboundDetails.push({
          source_page: url,
          target_url: abs,
          target_domain: dom,
          anchor_text: anchor,
          rel,
          nofollow,
          sponsored,
          ugc,
          link_type: classifyLink(abs),
        });
      } catch {}
    });
  }

  return { outboundDetails, pagesCrawled: visited.size, errors };
}

/* ============================================================
   MAIN HANDLER
============================================================ */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const target = normalizeUrl(body.url);
    const mode: Mode = body.mode === "pro" ? "pro" : "mvp";

    if (!target) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    const userId =
      body.userId ||
      body.u ||
      "9b7e2a2a-7f2f-4f6a-9d9e-falmeida000001";

    // Pro gets deeper crawl by default
    const depth = Number(body.depth ?? (mode === "pro" ? 2 : 1));
    const maxPages = Number(body.maxPages ?? (mode === "pro" ? 12 : 6));

    const { outboundDetails, pagesCrawled, errors } = await crawlSite(
      target,
      mode,
      depth,
      maxPages
    );

    // unique outbound
    const uniqueOutbound = Array.from(
      new Set(outboundDetails.map((l) => l.target_url))
    );

    const refDomains = new Set(
      outboundDetails.map((l) => l.target_domain).filter(Boolean)
    );

    const result: BacklinkResult = {
      target,
      totalBacklinks: uniqueOutbound.length,
      refDomains: refDomains.size,
      sample: uniqueOutbound.slice(0, 10),

      pagesCrawled,
      uniqueOutbound: uniqueOutbound.length,
      linksDetailed: outboundDetails.slice(0, 200),
      errors,
    };

    // Save summary + details
    try {
      const supabase = getSupabaseAdmin();
      const domain = getDomain(target);

      const { data: scanRow, error: scanErr } = await supabase
        .from("backlinks_scans")
        .insert({
          user_id: userId,
          url: target,
          domain,
          mode,
          total_backlinks: result.totalBacklinks,
          ref_domains: result.refDomains,
          sample: result.sample,
        })
        .select("id")
        .single();

      if (scanErr) throw scanErr;

      const scanId = scanRow?.id;

      if (scanId && outboundDetails.length) {
        const payload = outboundDetails.map((l) => ({
          scan_id: scanId,
          user_id: userId,
          source_page: l.source_page,
          target_url: l.target_url,
          target_domain: l.target_domain,
          anchor_text: l.anchor_text,
          rel: l.rel,
          nofollow: l.nofollow,
          sponsored: l.sponsored,
          ugc: l.ugc,
          link_type: l.link_type,
        }));

        // bulk insert
        await supabase.from("backlinks_scan_links").insert(payload);
      }
    } catch (dbErr) {
      console.error("Supabase insert error:", dbErr);
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Scan failed" },
      { status: 500 }
    );
  }
}
