// app/api/backlink-index/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabaseAdmin() {
  const url =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
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

type IndexRow = {
  target_domain: string;
  linking_domain: string | null;
  linking_url: string;
  first_seen_at: string | null;
  last_seen_at: string | null;
  total_scans_seen: number | null;
};

type DomainBucket = {
  linking_domain: string;
  links_count: number;
  first_seen_at: string | null;
  last_seen_at: string | null;
};

type LatestLink = {
  target_domain: string;
  linking_domain: string;
  linking_url: string;
  first_seen_at: string | null;
  last_seen_at: string | null;
  total_scans_seen: number;
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const rawDomain =
      (searchParams.get("d") || searchParams.get("domain") || "")
        .toLowerCase()
        .trim();

    if (!rawDomain) {
      return NextResponse.json(
        { ok: false, error: "Missing ?d=example.com parameter" },
        { status: 400 }
      );
    }

    // Normalize e.g. "https://lustmia.com/path" → "lustmia.com"
    let targetDomain = rawDomain;
    try {
      if (rawDomain.includes("/")) {
        targetDomain = new URL(
          rawDomain.startsWith("http") ? rawDomain : `https://${rawDomain}`
        ).hostname;
      }
      targetDomain = targetDomain.replace(/^www\./, "");
    } catch {
      // if URL parsing explodes, just keep whatever user passed
    }

    const supabase = getSupabaseAdmin();

    // 1) Fetch all index rows for this domain
    const { data: rows, error } = await supabase
      .from("backlink_index_links")
      .select(
        `
        target_domain,
        linking_domain,
        linking_url,
        first_seen_at,
        last_seen_at,
        total_scans_seen
      `
      )
      .eq("target_domain", targetDomain);

    if (error) throw error;

    if (!rows || rows.length === 0) {
      // No index data yet for this domain
      return NextResponse.json({
        ok: true,
        targetDomain,
        totals: {
          totalLinks: 0,
          refDomains: 0,
          oldest: null,
          newest: null,
        },
        byDomain: [],
        latestLinks: [],
      });
    }

    const domainMap = new Map<string, DomainBucket>();
    const latestLinks: LatestLink[] = [];

    for (const raw of rows as IndexRow[]) {
      const dom = (raw.linking_domain || "").toLowerCase().trim();
      if (!dom) continue;

      const first = raw.first_seen_at ?? raw.last_seen_at ?? null;
      const last = raw.last_seen_at ?? raw.first_seen_at ?? null;

      // Aggregate counts & date ranges by domain
      const bucket = domainMap.get(dom);
      if (!bucket) {
        domainMap.set(dom, {
          linking_domain: dom,
          links_count: 1,
          first_seen_at: first,
          last_seen_at: last,
        });
      } else {
        bucket.links_count += 1;

        if (first && (!bucket.first_seen_at || first < bucket.first_seen_at)) {
          bucket.first_seen_at = first;
        }
        if (last && (!bucket.last_seen_at || last > bucket.last_seen_at)) {
          bucket.last_seen_at = last;
        }
      }

      // Latest links list
      latestLinks.push({
        target_domain: raw.target_domain,
        linking_domain: dom,
        linking_url: raw.linking_url,
        first_seen_at: first,
        last_seen_at: last,
        total_scans_seen: Number(raw.total_scans_seen || 1),
      });
    }

    const byDomain = Array.from(domainMap.values()).sort(
      (a, b) => b.links_count - a.links_count
    );

    const totalLinks = byDomain.reduce(
      (sum, r) => sum + (r.links_count || 0),
      0
    );
    const refDomains = byDomain.length;

    // 2) Age metrics across all links
    const allDates = latestLinks
      .map((l) => l.first_seen_at)
      .concat(latestLinks.map((l) => l.last_seen_at))
      .filter(Boolean) as string[];

    const oldest =
      allDates.length > 0
        ? allDates.reduce((min, d) => (d < min ? d : min), allDates[0])
        : null;

    const newest =
      allDates.length > 0
        ? allDates.reduce((max, d) => (d > max ? d : max), allDates[0])
        : null;

    return NextResponse.json({
      ok: true,
      targetDomain,
      totals: {
        totalLinks,
        refDomains,
        oldest,
        newest,
      },
      byDomain,
      latestLinks,
    });
  } catch (e: any) {
    console.error("Global backlink index API failed:", e);
    return NextResponse.json(
      {
        ok: false,
        error:
          e?.message ||
          "Failed to load backlink index (internal error – see logs).",
      },
      { status: 500 }
    );
  }
}
