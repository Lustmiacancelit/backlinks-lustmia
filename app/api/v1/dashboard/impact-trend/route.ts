import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const target = (searchParams.get("target") || "").trim();
  const days = Math.min(30, Math.max(1, Number(searchParams.get("days") || 7)));

  if (!target) return NextResponse.json({ error: "Missing target" }, { status: 400 });

  const supabase = createSupabaseServer();

  const since = new Date();
  since.setDate(since.getDate() - (days + 2));

  const { data, error } = await supabase
    .from("backlinks_scans")
    .select("created_at,total_backlinks")
    .eq("domain", target)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Build daily delta of total_backlinks (placeholder “net_impact”)
  const daily = new Map<string, number>();
  let prev = 0;

  for (const row of data || []) {
    const date = isoDate(new Date((row as any).created_at));
    const total = Number((row as any).total_backlinks ?? 0);
    const delta = total - prev;
    prev = total;

    daily.set(date, (daily.get(date) ?? 0) + delta);
  }

  const filled = Array.from({ length: days }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const key = isoDate(d);
    return { date: key, net_impact: daily.get(key) ?? 0 };
  });

  return NextResponse.json({ target, series: filled });
}
