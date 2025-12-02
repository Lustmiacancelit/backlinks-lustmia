import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  try {
    const secret = req.nextUrl.searchParams.get("secret");
    if (!secret || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    // 1) Load all enabled sweep settings
    const { data: settings, error } = await supabase
      .from("toxic_sweep_settings")
      .select("*")
      .eq("enabled", true);

    if (error) throw error;
    if (!settings || !settings.length) {
      return NextResponse.json({ ok: true, message: "No enabled sweeps" });
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.SITE_URL ||
      "https://backlinks.lustmia.com";

    const results: any[] = [];

    for (const setting of settings) {
      const { user_id, domain, cadence_days, last_run_at } = setting;
      if (!user_id || !domain) continue;

      const cadenceDays = cadence_days ?? 30;
      const now = new Date();

      if (last_run_at) {
        const last = new Date(last_run_at);
        const diffMs = now.getTime() - last.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays < cadenceDays - 0.5) {
          // Not due yet
          continue;
        }
      }

      const targetUrl = domain.startsWith("http")
        ? domain
        : `https://${domain}`;

      let scanData: any = null;
      let scanError: string | null = null;

      try {
        const res = await fetch(`${baseUrl}/api/backlinks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: targetUrl,
            mode: "pro",
            userId: user_id,
          }),
        });

        scanData = await res.json().catch(() => ({}));

        if (!res.ok) {
          scanError = scanData?.error || `Scan failed (${res.status})`;
        }
      } catch (e: any) {
        scanError = e?.message || "Network error running scan";
      }

      if (scanError) {
        results.push({ user_id, domain, error: scanError });
        // still update last_run_at so cron doesn't hammer failing targets
        await supabase
          .from("toxic_sweep_settings")
          .update({ last_run_at: now.toISOString() })
          .eq("user_id", user_id);
        continue;
      }

      const totalBacklinks = Number(scanData?.totalBacklinks ?? 0);
      const refDomains = Number(scanData?.refDomains ?? 0);

      // For now we don't have per-link toxicity, so we store 0 and rely on later AI.
      const toxicLinks = 0;
      const toxicPercent =
        totalBacklinks > 0
          ? Math.round((toxicLinks / totalBacklinks) * 100)
          : 0;

      // 2) Store sweep summary
      const { error: insertErr } = await supabase.from("toxic_sweeps").insert({
        user_id,
        domain,
        mode: "pro",
        total_backlinks: totalBacklinks,
        ref_domains: refDomains,
        toxic_links: toxicLinks,
        toxic_percent: toxicPercent,
        raw: scanData,
      });

      if (insertErr) {
        results.push({ user_id, domain, error: insertErr.message });
      } else {
        results.push({
          user_id,
          domain,
          totalBacklinks,
          refDomains,
          toxicLinks,
          toxicPercent,
        });
      }

      // 3) Mark as run
      await supabase
        .from("toxic_sweep_settings")
        .update({ last_run_at: now.toISOString() })
        .eq("user_id", user_id);
    }

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Sweep run failed" },
      { status: 500 },
    );
  }
}
