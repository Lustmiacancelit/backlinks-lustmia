import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

type BacklinkResult = {
  target: string;
  totalBacklinks: number;
  refDomains: number;
  sample: string[];
};

function normalizeUrl(input: string) {
  const raw = (input || "").trim();
  if (!raw) return "";

  try {
    return new URL(raw).toString();
  } catch {
    // if user typed without protocol
    return new URL("https://" + raw).toString();
  }
}

function getDomain(u: string) {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    const target = normalizeUrl(url);

    if (!target) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    // timeout protection
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const res = await fetch(target, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        Referer: "https://www.google.com/",
      },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Request failed with status code ${res.status}` },
        { status: res.status }
      );
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const targetDomain = getDomain(target);

    // Collect all outbound links on the page
    const links: string[] = [];
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;

      // ignore anchors, mailto, tel, js
      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:")
      ) {
        return;
      }

      try {
        const abs = new URL(href, target).toString();
        links.push(abs);
      } catch {
        // ignore malformed
      }
    });

    // Deduplicate
    const uniqueLinks = Array.from(new Set(links));

    // Keep only outbound (exclude internal)
    const outbound = uniqueLinks.filter(
      (l) => getDomain(l) && getDomain(l) !== targetDomain
    );

    const refDomains = new Set(outbound.map(getDomain).filter(Boolean));

    const result: BacklinkResult = {
      target,
      totalBacklinks: outbound.length, // MVP proxy
      refDomains: refDomains.size,
      sample: outbound.slice(0, 10),
    };

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Scan failed" },
      { status: 500 }
    );
  }
}
