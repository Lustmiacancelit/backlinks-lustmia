import { NextResponse } from "next/server";

export const runtime = "nodejs"; // keep it simple for fetch + parsing

function toHttps(domainOrUrl: string) {
  const v = domainOrUrl.trim();
  if (!v) return "";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  return `https://${v}`;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const domain = searchParams.get("domain") || "";
    const url = toHttps(domain);

    if (!url) {
      return NextResponse.json(
        { error: "Missing ?domain= parameter" },
        { status: 400 }
      );
    }

    // Google PageSpeed Insights (no key required for basic usage; optional key if you have one)
    const key = process.env.PAGESPEED_API_KEY;
    const psiUrl =
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
      `?url=${encodeURIComponent(url)}` +
      `&strategy=mobile` +
      `&category=performance&category=seo&category=accessibility&category=best-practices` +
      (key ? `&key=${encodeURIComponent(key)}` : "");

    const r = await fetch(psiUrl, { cache: "no-store" });
    const data = await r.json();

    if (!r.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "PageSpeed request failed" },
        { status: 502 }
      );
    }

    const cats = data?.lighthouseResult?.categories || {};
    const score = (x: any) =>
      typeof x?.score === "number" ? Math.round(x.score * 100) : null;

    return NextResponse.json({
      domain,
      fetchedUrl: url,
      scores: {
        performance: score(cats.performance),
        seo: score(cats.seo),
        accessibility: score(cats.accessibility),
        bestPractices: score(cats["best-practices"]),
      },
      // useful for debugging / UI drill-down later:
      analyzedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
