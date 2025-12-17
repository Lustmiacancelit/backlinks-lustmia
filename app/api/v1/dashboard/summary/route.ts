import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const target = (searchParams.get("target") || "").trim();
  if (!target) return NextResponse.json({ error: "Missing target" }, { status: 400 });

  const supabase = createSupabaseServer();

  // Latest scan summary (already has totals)
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
      kpis: {
        total_backlinks: 0,
        ref_domains: 0,
        negative_impact_links: 0,
        growth_score: 0,
        net_impact_change_7d: 0,
      },
    });
  }

  // Temporary “negative impact” until the decision engine:
  // (we’ll replace this with real scoring based on spam_risk + link patterns)
  const total = Number(scan.total_backlinks ?? 0);
  const ref = Number(scan.ref_domains ?? 0);
  const negative = Math.max(0, Math.round(total * 0.04));
  const growthScore = total === 0 ? 0 : Math.min(100, Math.round((total / Math.max(1, ref)) * 8));

  return NextResponse.json({
    target,
    scan_id: scan.id,
    kpis: {
      total_backlinks: total,
      ref_domains: ref,
      negative_impact_links: negative,
      growth_score: growthScore,
      net_impact_change_7d: 0,
    },
  });
}
