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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawDomain = (searchParams.get("d") || searchParams.get("domain") || "")
      .toLowerCase()
      .trim();

    if (!rawDomain) {
      return NextResponse.json(
        { error: "Missing ?d=example.com parameter" },
        { status: 400 }
      );
    }

    // strip protocol / paths if user pastes full URL
    let targetDomain = rawDomain;
    try {
      if (rawDomain.includes("/")) {
        targetDomain = new URL(
          rawDomain.startsWith("http") ? rawDomain : `https://${rawDomain}`
        ).hostname;
      }
      targetDomain = targetDomain.replace(/^www\./, "");
    } catch {
      // leave as-is
    }

    const supabase = getSupabaseAdmin();

    // 1) Aggregate by linking_domain
    const { data: byDomainRows, error: aggError } = await supabase
      .from("backlink_index_links")
      .select(
        `
        linking_domain,
        count(*) as links_count,
        min(first_seen_at) as first_seen_at,
        max(last_seen_at) as last_seen_at
      `
      )
      .eq("target_domain", targetDomain)
      .group("linking_domain")
      .order("links_count", { ascending: false });

    if (aggError) throw aggError;

    const byDomain = (byDomainRows || []).map((row: any) => ({
      linking_domain: row.linking_domain as string,
      links_count: Number(row.links_count || 0),
      first_seen_at: row.first_seen_at as string | null,
      last_seen_at: row.last_seen_at as string | null,
    }));

    const totalLinks = byDomain.reduce(
      (sum, r) => sum + (r.links_count || 0),
      0
    );
    const refDomains = byDomain.length;

    // 2) Latest individual backlinks (for detail list)
    const { data: latestLinksRows, error: latestError } = await supabase
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
      .eq("target_domain", targetDomain)
      .order("last_seen_at", { ascending: false, nullsLast: true })
      .limit(100);

    if (latestError) throw latestError;

    const latestLinks = (latestLinksRows || []).map((row: any) => ({
      target_domain: row.target_domain as string,
      linking_domain: row.linking_domain as string,
      linking_url: row.linking_url as string,
      first_seen_at: row.first_seen_at as string | null,
      last_seen_at: row.last_seen_at as string | null,
      total_scans_seen: Number(row.total_scans_seen || 1),
    }));

    // 3) Basic age metrics
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
        error: e?.message || "Failed to load backlink index",
      },
      { status: 500 }
    );
  }
}
