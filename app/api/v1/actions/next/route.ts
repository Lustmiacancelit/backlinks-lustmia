import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

type ActionItem = {
  type: string;
  priority: number;
  summary: string;
  estimated_impact: "HIGH" | "MEDIUM" | "LOW";
  confidence: number; // 0..1
  affected_urls: string[];
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const target = (searchParams.get("target") || "").trim();
  if (!target) return NextResponse.json({ error: "Missing target" }, { status: 400 });

  const supabase = createSupabaseServer();

  const { data: scan, error: scanErr } = await supabase
    .from("backlinks_scans")
    .select("id, domain, total_backlinks, ref_domains, created_at")
    .eq("domain", target)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (scanErr) return NextResponse.json({ error: scanErr.message }, { status: 500 });

  if (!scan) {
    return NextResponse.json({
      target,
      items: [
        {
          type: "RUN_SCAN",
          priority: 1,
          summary: "Run a scan to generate prioritized actions.",
          estimated_impact: "LOW",
          confidence: 0.5,
          affected_urls: [],
        },
      ],
    });
  }

  const scanId = scan.id;

  // Pull recent links for this scan (keep it light)
  const { data: links, error: linksErr } = await supabase
    .from("backlinks_scan_links")
    .select("target_url, target_domain, nofollow, sponsored, ugc, link_type")
    .eq("scan_id", scanId)
    .order("id", { ascending: false })
    .limit(2000);

  if (linksErr) return NextResponse.json({ error: linksErr.message }, { status: 500 });

  const total = links?.length ?? 0;
  const nofollowCount = (links || []).filter((l: any) => !!l.nofollow).length;
  const sponsoredCount = (links || []).filter((l: any) => !!l.sponsored).length;
  const ugcCount = (links || []).filter((l: any) => !!l.ugc).length;

  const nofollowPct = total ? (nofollowCount / total) * 100 : 0;
  const sponsoredPct = total ? (sponsoredCount / total) * 100 : 0;
  const ugcPct = total ? (ugcCount / total) * 100 : 0;

  // Find repeated target domains (helps identify “sitewide / low-quality” patterns)
  const domainCounts = new Map<string, number>();
  for (const l of links || []) {
    const d = String((l as any).target_domain || "").toLowerCase();
    if (!d) continue;
    domainCounts.set(d, (domainCounts.get(d) ?? 0) + 1);
  }
  const topDomains = [...domainCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([d]) => d);

  const items: ActionItem[] = [];

  if (nofollowPct >= 60) {
    items.push({
      type: "IMPROVE_DOFollow_MIX",
      priority: 1,
      summary: `Your scan shows a very high nofollow ratio (~${nofollowPct.toFixed(
        0
      )}%). Focus outreach on editorial dofollow placements and reduce low-value sources.`,
      estimated_impact: "MEDIUM",
      confidence: 0.72,
      affected_urls: topDomains,
    });
  }

  if (sponsoredPct >= 15) {
    items.push({
      type: "REVIEW_SPONSORED_LINKS",
      priority: 2,
      summary: `A notable portion of links are marked sponsored (~${sponsoredPct.toFixed(
        0
      )}%). Audit ROI + ensure these don’t dominate your backlink profile.`,
      estimated_impact: "MEDIUM",
      confidence: 0.68,
      affected_urls: topDomains,
    });
  }

  if (ugcPct >= 25) {
    items.push({
      type: "CLEAN_UP_UGC_SOURCES",
      priority: 3,
      summary: `UGC links are high (~${ugcPct.toFixed(
        0
      )}%). Identify forum/profile spam sources and prioritize removal or disavow candidates.`,
      estimated_impact: "HIGH",
      confidence: 0.75,
      affected_urls: topDomains,
    });
  }

  if (!items.length) {
    items.push({
      type: "NEXT_BEST_ACTION",
      priority: 1,
      summary: "Backlink profile looks balanced. Next: build more editorial links to your top converting pages.",
      estimated_impact: "LOW",
      confidence: 0.6,
      affected_urls: topDomains,
    });
  }

  return NextResponse.json({ target, scan_id: scanId, items });
}
