import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const strategy = (searchParams.get("strategy") || "desktop") as "mobile" | "desktop";

  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  const key = process.env.PAGESPEED_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Missing PAGESPEED_API_KEY" }, { status: 500 });
  }

  const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("strategy", strategy);
  endpoint.searchParams.set("key", key);

  // request the main categories (these power the “pie” scores)
  ["performance", "accessibility", "best-practices", "seo"].forEach((c) =>
    endpoint.searchParams.append("category", c)
  );

  const res = await fetch(endpoint.toString(), { cache: "no-store" });
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: data?.error?.message || "PageSpeed API error", details: data },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
