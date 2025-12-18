import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const strategy = searchParams.get("strategy") || "desktop";

  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  const key = process.env.PAGESPEED_API_KEY;
  if (!key)
    return NextResponse.json(
      { error: "Missing PAGESPEED_API_KEY" },
      { status: 500 }
    );

  const endpoint = new URL(
    "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
  );
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("strategy", strategy);
  endpoint.searchParams.set("key", key);

  endpoint.searchParams.append("category", "PERFORMANCE");
  endpoint.searchParams.append("category", "ACCESSIBILITY");
  endpoint.searchParams.append("category", "BEST_PRACTICES");
  endpoint.searchParams.append("category", "SEO");

  const r = await fetch(endpoint.toString(), { next: { revalidate: 0 } });
  const data = await r.json();

  if (!r.ok) {
    return NextResponse.json(
      { error: data?.error?.message || "PageSpeed error" },
      { status: 400 }
    );
  }

  return NextResponse.json(data);
}
