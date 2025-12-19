import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function toHttps(domainOrUrl: string) {
  const v = domainOrUrl.trim();
  if (!v) return "";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  return `https://${v}`;
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function daysBetween(a: Date, b: Date) {
  const ms = Math.abs(b.getTime() - a.getTime());
  return ms / (1000 * 60 * 60 * 24);
}

/**
 * Map raw values -> 0..100 “score”
 * Adjust these curves later once you see real distributions.
 */
function velocityToScore(linksPerDay: number) {
  // 0/day => 0, 1/day => ~25, 3/day => ~55, 10/day => ~85, 20+/day => 100
  const score = (Math.log10(linksPerDay + 1) / Math.log10(21)) * 100;
  return clamp(Math.round(score));
}

function spamToScore(spamPct: number) {
  // spamPct is already 0..100, lower is better but UI wants “Spam Risk %”
  return clamp(Math.round(spamPct));
}

function trendToScore(deltaPct: number) {
  // deltaPct could be negative/positive. Convert to 0..100 centered at 50.
  // -20% => ~30, 0% => 50, +20% => ~70, +50% => ~90
  const score = 50 + deltaPct; // 1:1 mapping for now
  return clamp(Math.round(score));
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const domain = (searchParams.get("domain") || searchParams.get("target") || "").trim();
    const url = toHttps(domain);

    if (!url) {
      return NextResponse.json(
        { error: "Missing ?domain= (or ?target=) parameter" }
        { status: 400 }
      );
    }

    // -----------------------------
    // 1) Supabase: REAL backlink data
    // -----------------------------
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRole) {
      return NextResponse.json(
        { error: "Missing SUPABASE env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false },
    });

    /**
     * ASSUMPTION: you store scans per domain.
     * Adjust table/columns to your schema:
     * - scans table: { id, domain, created_at }
     * - backlinks table: { id, scan_id, created_at, is_toxic, referring_domain }
     *
     * If your schema differs, tell me your tables/columns and I’ll map it exactly.
     */

    // Latest scan for this domain
    const { data: latestScan, error: scanErr } = await supabase
      .from("scans")
      .select("id, created_at, domain")
      .eq("domain", domain)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (scanErr) {
      return NextResponse.json(
        { error: `Supabase scans query failed: ${scanErr.message}` },
        { status: 502 }
      );
    }

    // If no scan yet, still return something usable
    if (!latestScan?.id) {
      // Optional: still fetch PageSpeed and return zeros
      return NextResponse.json({
        domain,
        fetchedUrl: url,
        analyzedAt: new Date().toISOString(),
        siteHealth: {
          authorityTrend: 0,
          backlinkVelocity: 0,
          spamRisk: 0,
          notes: "No scans found for this domain yet.",
        },
      });
    }

    const scanId = latestScan.id;

    // Get backlinks for latest scan (count, toxic count, distinct referring domains)
    const { data: backlinks, error: blErr } = await supabase
      .from("backlinks")
      .select("id, created_at, is_toxic, referring_domain")
      .eq("scan_id", scanId);

    if (blErr) {
      return NextResponse.json(
        { error: `Supabase backlinks query failed: ${blErr.message}` },
        { status: 502 }
      );
    }

    const totalBacklinks = backlinks?.length ?? 0;
    const toxicBacklinks = (backlinks ?? []).filter((b) => !!b.is_toxic).length;

    const referringDomainsSet = new Set(
      (backlinks ?? [])
        .map((b) => (b.referring_domain || "").trim().toLowerCase())
        .filter(Boolean)
    );
    const referringDomains = referringDomainsSet.size;

    // Backlink velocity (links/day) since scan created_at to now
    const scanDate = new Date(latestScan.created_at);
    const now = new Date();
    const days = Math.max(1, Math.round(daysBetween(scanDate, now)));
    const linksPerDay = totalBacklinks / days;

    // Spam risk %
    const spamPct =
      totalBacklinks > 0 ? (toxicBacklinks / totalBacklinks) * 100 : 0;

    // Authority trend: compare last 30 days referring domains vs previous 30 days
    // (Uses scan history + backlinks per scan)
    const since = new Date();
    since.setDate(since.getDate() - 60);

    const { data: recentScans, error: recentErr } = await supabase
      .from("scans")
      .select("id, created_at")
      .eq("domain", domain)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true });

    if (recentErr) {
      return NextResponse.json(
        { error: `Supabase recent scans query failed: ${recentErr.message}` },
        { status: 502 }
      );
    }

    // Collect referring domains by time window from those scans
    const mid = new Date();
    mid.setDate(mid.getDate() - 30);

    let rdLast30 = new Set<string>();
    let rdPrev30 = new Set<string>();

    if ((recentScans ?? []).length > 0) {
      const scanIds = (recentScans ?? []).map((s) => s.id);

      const { data: bl60, error: bl60Err } = await supabase
        .from("backlinks")
        .select("scan_id, referring_domain, created_at")
        .in("scan_id", scanIds);

      if (bl60Err) {
        return NextResponse.json(
          { error: `Supabase 60d backlinks query failed: ${bl60Err.message}` },
          { status: 502 }
        );
      }

      for (const b of bl60 ?? []) {
        const rd = (b.referring_domain || "").trim().toLowerCase();
        if (!rd) continue;

        const created = new Date(b.created_at);
        if (created >= mid) rdLast30.add(rd);
        else rdPrev30.add(rd);
      }
    }

    const last30Count = rdLast30.size;
    const prev30Count = rdPrev30.size;

    // deltaPct: (last - prev)/prev * 100
    const deltaPct =
      prev30Count > 0 ? ((last30Count - prev30Count) / prev30Count) * 100 : (last30Count > 0 ? 100 : 0);

    // Convert to 0..100 bars
    const authorityTrend = trendToScore(deltaPct);
    const backlinkVelocity = velocityToScore(linksPerDay);
    const spamRisk = spamToScore(spamPct);

    // -----------------------------
    // 2) Optional: PageSpeed scores (keep what you already had)
    // -----------------------------
    const key = process.env.PAGESPEED_API_KEY;
    const psiUrl =
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
      `?url=${encodeURIComponent(url)}` +
      `&strategy=mobile` +
      `&category=performance&category=seo&category=accessibility&category=best-practices` +
      (key ? `&key=${encodeURIComponent(key)}` : "");

    let pageSpeed: any = null;

    try {
      const r = await fetch(psiUrl, { cache: "no-store" });
      const data = await r.json();

      if (r.ok) {
        const cats = data?.lighthouseResult?.categories || {};
        const score = (x: any) =>
          typeof x?.score === "number" ? Math.round(x.score * 100) : null;

        pageSpeed = {
          performance: score(cats.performance),
          seo: score(cats.seo),
          accessibility: score(cats.accessibility),
          bestPractices: score(cats["best-practices"]),
        };
      }
    } catch {
      // ignore PSI failures; backlink metrics still return
    }

    return NextResponse.json({
      domain,
      fetchedUrl: url,
      analyzedAt: new Date().toISOString(),
      scan: {
        id: scanId,
        createdAt: latestScan.created_at,
      },
      realMetrics: {
        totalBacklinks,
        referringDomains,
        toxicBacklinks,
        linksPerDay: Number(linksPerDay.toFixed(2)),
        spamPct: Number(spamPct.toFixed(2)),
        last30RefDomains: last30Count,
        prev30RefDomains: prev30Count,
        deltaPct: Number(deltaPct.toFixed(2)),
      },
      siteHealth: {
        authorityTrend,   // 0..100
        backlinkVelocity, // 0..100
        spamRisk,         // 0..100 (risk)
      },
      pageSpeed,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
