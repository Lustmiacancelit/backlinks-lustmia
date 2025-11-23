import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";

function normalizeUrl(u: string) {
  try {
    const url = new URL(u);
    return url.origin;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    const target = normalizeUrl(url);

    if (!target) {
      return NextResponse.json(
        { error: "Invalid URL. Example: https://example.com" },
        { status: 400 }
      );
    }

    // Simple crawl: fetch homepage and extract outbound links
    const html = (await axios.get(target, { timeout: 15000 })).data as string;
    const $ = cheerio.load(html);

    const links: string[] = [];
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      try {
        const abs = new URL(href, target).href;
        // outbound only
        if (!abs.startsWith(target)) links.push(abs);
      } catch {}
    });

    const unique = Array.from(new Set(links));

    // MVP response (we’ll expand to deep crawl + DA later)
    return NextResponse.json({
      target,
      totalBacklinks: unique.length,
      refDomains: new Set(unique.map(l => new URL(l).hostname)).size,
      sample: unique.slice(0, 10),
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
