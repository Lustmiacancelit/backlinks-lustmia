// app/api/cron/reindex/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * Admin Supabase client (service role).
 */
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

/**
 * Extracts hostname without www from a URL string.
 */
function getDomain(u: string | null | undefined): string {
  if (!u) return "";
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// How many domains to reindex per cron run
const TARGET_BATCH_SIZE = 5;

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const nowIso = new Date().toISOString();

    // 1) Pick a small batch of targets that are either never indexed
    //    or were indexed the longest time ago.
    const { data: targets, error: targetsError } = await supabase
      .from("backlink_targets")
      .select("*")
      .order("last_indexed", { ascending: true, nullsFirst: true })
      .limit(TARGET_BATCH_SIZE);

    if (targetsError) {
      throw targetsError;
    }

    if (!targets || targets.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No backlink targets to index.",
      });
    }

    const results: Array<{
      target_id: string;
      domain: string;
      index_rows: number;
      scans_used: number;
    }> = [];

    for (const target of targets) {
      const domain: string = target.domain;
      if (!domain) continue;

      // 2) Load all scans for this domain
      const { data: scans, error: scansError } = await supabase
        .from("backlinks_scans")
        .select("id, created_at")
        .eq("domain", domain)
        .order("created_at", { ascending: true });

      if (scansError) {
        console.error("Error loading scans for", domain, scansError);
        continue;
      }

      if (!scans || scans.length === 0) {
        // No scans yet – just mark as indexed so we don't keep retrying.
        await supabase
          .from("backlink_targets")
          .update({ last_indexed: nowIso })
          .eq("id", target.id);
        results.push({
          target_id: target.id,
          domain,
          index_rows: 0,
          scans_used: 0,
        });
        continue;
      }

      const scanIds = scans.map((s: any) => s.id as string);
      const scanCreatedAtMap = new Map<string, string>();
      for (const s of scans) {
        scanCreatedAtMap.set(
          s.id as string,
          (s.created_at as string) || nowIso
        );
      }

      // 3) Load all link rows for those scans
      const { data: links, error: linksError } = await supabase
        .from("backlinks_scan_links")
        .select("scan_id, source_page, target_url")
        .in("scan_id", scanIds);

      if (linksError) {
        console.error("Error loading scan links for", domain, linksError);
        continue;
      }

      if (!links || links.length === 0) {
        // No links found – clear old index for this domain & update timestamp.
        await supabase
          .from("backlink_index_links")
          .delete()
          .eq("target_domain", domain);

        await supabase
          .from("backlink_targets")
          .update({ last_indexed: nowIso })
          .eq("id", target.id);

        results.push({
          target_id: target.id,
          domain,
          index_rows: 0,
          scans_used: scans.length,
        });
        continue;
      }

      // 4) Aggregate into (target_domain, linking_domain, linking_url)
      type AggRow = {
        target_domain: string;
        linking_domain: string;
        linking_url: string;
        first_seen_at: string;
        last_seen_at: string;
        total_scans_seen: number;
        last_scan_id: string;
        last_scan_at: string;
      };

      const aggMap = new Map<string, AggRow>();

      for (const l of links as any[]) {
        const source = l.source_page as string;
        const scanId = l.scan_id as string;
        const scanCreatedAt =
          scanCreatedAtMap.get(scanId) || nowIso;

        const linkingDomain = getDomain(source);
        if (!linkingDomain) continue;

        const key = `${domain}::${linkingDomain}::${source}`;
        const existing = aggMap.get(key);

        if (!existing) {
          aggMap.set(key, {
            target_domain: domain,
            linking_domain: linkingDomain,
            linking_url: source,
            first_seen_at: scanCreatedAt,
            last_seen_at: scanCreatedAt,
            total_scans_seen: 1,
            last_scan_id: scanId,
            last_scan_at: scanCreatedAt,
          });
        } else {
          // update aggregate
          existing.total_scans_seen += 1;

          if (scanCreatedAt < existing.first_seen_at) {
            existing.first_seen_at = scanCreatedAt;
          }
          if (scanCreatedAt >= existing.last_seen_at) {
            existing.last_seen_at = scanCreatedAt;
            existing.last_scan_id = scanId;
            existing.last_scan_at = scanCreatedAt;
          }
        }
      }

      const aggRows = Array.from(aggMap.values());

      // 5) Replace index rows for this domain with fresh aggregate
      //    (simpler & always consistent).
      await supabase
        .from("backlink_index_links")
        .delete()
        .eq("target_domain", domain);

      if (aggRows.length > 0) {
        const { error: insertError } = await supabase
          .from("backlink_index_links")
          .insert(aggRows);

        if (insertError) {
          console.error(
            "Error inserting backlink index rows for",
            domain,
            insertError
          );
          continue;
        }
      }

      // 6) Update target's last_indexed timestamp
      await supabase
        .from("backlink_targets")
        .update({ last_indexed: nowIso })
        .eq("id", target.id);

      results.push({
        target_id: target.id,
        domain,
        index_rows: aggRows.length,
        scans_used: scans.length,
      });
    }

    return NextResponse.json({
      ok: true,
      processed: results,
    });
  } catch (e: any) {
    console.error("Cron /api/cron/reindex failed:", e);
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "Reindex cron failed",
      },
      { status: 500 }
    );
  }
}
