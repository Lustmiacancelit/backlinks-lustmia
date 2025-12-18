import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const strategy = searchParams.get("strategy") || "desktop"; // desktop|mobile

  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  const key = process.env.PAGESPEED_API_KEY;
  if (!key) return NextResponse.json({ error: "Missing PAGESPEED_API_KEY" }, { status: 500 });

  const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("strategy", strategy);
  endpoint.searchParams.set("key", key);

  // Optional: request specific categories
  endpoint.searchParams.append("category", "PERFORMANCE");
  endpoint.searchParams.append("category", "ACCESSIBILITY");
  endpoint.searchParams.append("category", "BEST_PRACTICES");
  endpoint.searchParams.append("category", "SEO");

  const r = await fetch(endpoint.toString(), { next: { revalidate: 0 } });
  const data = await r.json();

  if (!r.ok) return NextResponse.json({ error: data?.error?.message || "PageSpeed error" }, { status: 400 });

  const categories = data?.lighthouseResult?.categories || {};
  const audits = data?.lighthouseResult?.audits || {};

  const score = (v: any) => (typeof v === "number" ? Math.round(v * 100) : null);

  return NextResponse.json({
    url: data?.lighthouseResult?.finalUrl || url,
    strategy,
    scores: {
      performance: score(categories?.performance?.score),
      accessibility: score(categories?.accessibility?.score),
      bestPractices: score(categories?.["best-practices"]?.score),
      seo: score(categories?.seo?.score),
    },
    metrics: {
      fcp: audits?.["first-contentful-paint"]?.displayValue,
      lcp: audits?.["largest-contentful-paint"]?.displayValue,
      cls: audits?.["cumulative-layout-shift"]?.displayValue,
      tbt: audits?.["total-blocking-time"]?.displayValue,
      si: audits?.["speed-index"]?.displayValue,
    },
  });
}
