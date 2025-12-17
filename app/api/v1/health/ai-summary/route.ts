import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const target = (searchParams.get("target") || "").trim();
  if (!target) return NextResponse.json({ error: "Missing target" }, { status: 400 });

  const supabase = createSupabaseServer();

  const { data, error } = await supabase
    .from("site_health")
    .select("authority_trend, backlink_velocity, spam_risk, ai_summary, created_at")
    .eq("domain", target)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const authority = Number(data?.authority_trend ?? 0);
  const velocity = Number(data?.backlink_velocity ?? 0);
  const spamRisk = Number(data?.spam_risk ?? 0);

  return NextResponse.json({
    target,
    bars: {
      authority_trend: { value: authority, label: "Authority Trend" },
      backlink_velocity: { value: velocity, label: "Backlink Velocity" },
      spam_risk: { value: spamRisk, label: "Spam Risk" },
    },
    tip:
      typeof data?.ai_summary === "string" && data.ai_summary.trim()
        ? data.ai_summary
        : "Run Site Health to generate AI recommendations.",
  });
}
