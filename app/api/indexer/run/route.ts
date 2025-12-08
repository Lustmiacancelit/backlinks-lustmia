// app/api/indexer/run/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";

export const runtime = "nodejs";

// -----------------------------
// Supabase admin client
// -----------------------------
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE;

  if (!url || !key) {
    throw new Error(
      "Supabase admin not configured. Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

// -----------------------------
// Helpers
// -----------------------------
function normalizeDomain(domain: string): string {
  const raw = (domain || "").trim().toLowerCase();
  return raw.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function buildStartUrl(domain: string): string {
  const cleaned = normalizeDomain(domain);
  return `https://${cleaned}`;
}

function getDomain(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isProbablyHtml(url: string) {
  return !/\.(pdf|jpg|jpeg|png|gif|webp|zip|rar|mp4|mp3|svg|css|js)$/i.test(url);
}

type LinkType = "editorial" | "directory" | "social" | "other";

function classifyLink(targetUrl: string): LinkType {
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
  ) {
    return "social";
  }

  if (
    d.includes("directory") ||
    d.includes("listing") ||
    d.includes("yellowpages") ||
    d.includes("map") ||
    d.includes("wiki")
  ) {
    return "directory";
  }

  return "editorial";
}

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  const res = await fetch(url, {
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
    throw new Error(`Fetch failed with status ${res.status}`);
  }

  return await res.text();
}

// -----------------------------
// Crawl + index one domain
// -----------------------------

type TargetRow = {
  id: string;
  user_id: string | null;
  domain: string;
};

async function indexSingleDomain(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  target: TargetRow
) {
  const startUrl = buildStartUrl(target.domain);
  const targetDomain = normalizeDomain(target.domain);

  const visited = new Set<string>();
  const queue: Array<{ url: string; depth: number }> = [
    { url: startUrl, depth: 0 },
  ];

  const maxPages = 10; // v1 – keep this small for now
  const maxDepth = 2;
  const maxLinksPerDomain = 1000;

  type FoundLink = {
    linking_url: string;
    linking_domain: string;
    anchor: string | null;
    rel: string | null;
    nofollow: boolean;
    sponsored: boolean;
    ugc: boolean;
    link_type: LinkType;
  };

  const foundLinks: FoundLink[] = [];

  while (queue.length && visited.size < maxPages) {
    const { url, depth } = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);

    let html: string;
    try {
      html = await fetchHtml(url);
    } catch (err: any) {
      console.error("Indexer fetch error:", url, err?.message || err);
      continue;
    }

    const $ = cheerio.load(html);

    // Enqueue internal pages
    if (depth < maxDepth) {
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;

        if (
          href.startsWith("#") ||
          href.startsWith("mailto:") ||
          href.startsWith("tel:") ||
          href.startsWith("javascript:")
        ) {
          return;
        }

        try {
          const abs = new URL(href, url).toString();
          const dom = getDomain(abs);
          if (dom && normalizeDomain(dom) === targetDomain && isProbablyHtml(abs)) {
            if (!visited.has(abs)) {
              queue.push({ url: abs, depth: depth + 1 });
            }
          }
        } catch {
          // ignore
        }
      });
    }

    // Collect outbound links
    $("a[href]").each((_, el) => {
      if (foundLinks.length >= maxLinksPerDomain) return;

      const href = $(el).attr("href");
      if (!href) return;

      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:")
      ) {
        return;
      }

      try {
        const abs = new URL(href, url).toString();
        const dom = getDomain(abs);
        if (!dom) return;

        const normalizedDom = normalizeDomain(dom);

        // Only store **external** links (other sites)
        if (normalizedDom === targetDomain) return;

        const anchor = $(el).text().trim() || null;
        const relAttr = ($(el).attr("rel") || "").toLowerCase();
        const rel = relAttr || null;

        const nofollow = relAttr.includes("nofollow");
        const sponsored = relAttr.includes("sponsored");
        const ugc = relAttr.includes("ugc");

        foundLinks.push({
          linking_url: abs,
          linking_domain: normalizedDom,
          anchor,
          rel,
          nofollow,
          sponsored,
          ugc,
          link_type: classifyLink(abs),
        });
      } catch {
        // ignore invalid URLs
      }
    });
  }

  if (!foundLinks.length) {
    return { pagesCrawled: visited.size, linksIndexed: 0 };
  }

  const nowIso = new Date().toISOString();

  // Prepare upsert payload (dedupe by linking_url)
  const uniqueByUrl = new Map<string, FoundLink>();
  for (const l of foundLinks) {
    if (!uniqueByUrl.has(l.linking_url)) {
      uniqueByUrl.set(l.linking_url, l);
    }
  }

  const payload = Array.from(uniqueByUrl.values()).map((l) => ({
    target_domain: targetDomain,
    linking_domain: l.linking_domain,
    linking_url: l.linking_url,
    link_type: l.link_type,
    link_anchor: l.anchor,
    rel: l.rel,
    nofollow: l.nofollow,
    sponsored: l.sponsored,
    ugc: l.ugc,
    link_last_seen_at: nowIso,
    link_status: "active",
    last_scan_at: nowIso,
    last_scan_source: "indexer",
  }));

  const { error: upsertErr, count } = await supabase
    .from("backlink_index_links")
    .upsert(payload, {
      onConflict: "target_domain,linking_domain,linking_url",
      ignoreDuplicates: false,
      count: "exact",
    });

  if (upsertErr) {
    console.error("Indexer upsert error:", upsertErr);
    throw upsertErr;
  }

  // Update backlink_targets.last_indexed
  const { error: updateErr } = await supabase
    .from("backlink_targets")
    .update({ last_indexed: nowIso })
    .eq("id", target.id);

  if (updateErr) {
    console.error("Failed to update last_indexed:", updateErr);
  }

  return {
    pagesCrawled: visited.size,
    linksIndexed: count ?? payload.length,
  };
}

// -----------------------------
// Main handler (GET & POST)
// -----------------------------

async function handleRun() {
  try {
    const supabase = getSupabaseAdmin();

    // Pick a small batch of targets that are never indexed or stale (> 24h)
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: targets, error: targetErr } = await supabase
      .from("backlink_targets")
      .select("id,user_id,domain,last_indexed")
      .or(`last_indexed.is.null,last_indexed.lte.${cutoff}`)
      .order("last_indexed", { ascending: true, nullsFirst: true })
      .limit(3); // small batch per run

    if (targetErr) throw targetErr;

    if (!targets || !targets.length) {
      return NextResponse.json({
        ok: true,
        message: "No targets to index right now.",
      });
    }

    const results: any[] = [];

    for (const t of targets) {
      try {
        const stats = await indexSingleDomain(supabase, t as TargetRow);
        results.push({
          domain: t.domain,
          ok: true,
          ...stats,
        });
      } catch (err: any) {
        console.error("Indexing error for domain", t.domain, err);
        results.push({
          domain: t.domain,
          ok: false,
          error: err?.message || "Unknown error",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      processed: results.length,
      results,
    });
  } catch (e: any) {
    console.error("Indexer run failed:", e);
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "Indexer run failed",
      },
      { status: 500 }
    );
  }
}

// Support both GET (for Vercel Cron) and POST (manual)
export async function GET() {
  return handleRun();
}

export async function POST() {
  return handleRun();
}
