import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

type BacklinkResult = {
  target: string;
  totalBacklinks: number;
  refDomains: number;
  sample: string[];
};

type Mode = "mvp" | "pro";

function normalizeUrl(input: string) {
  const raw = (input || "").trim();
  if (!raw) return "";
  try {
    return new URL(raw).toString();
  } catch {
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

async function fetchHtmlMvp(target: string) {
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
    const err = new Error(`Request failed with status code ${res.status}`);
    // attach status so caller can decide next step
    (err as any).status = res.status;
    throw err;
  }

  return await res.text();
}

async function fetchHtmlPro(target: string) {
  const token = process.env.BROWSERLESS_TOKEN;
  if (!token) {
    throw new Error(
      "Pro Scan not configured. Missing BROWSERLESS_TOKEN env var."
    );
  }

  // Browserless /unblock API + residential proxy
  // Docs: https://docs.browserless.io/rest-apis/content (see /unblock section)
  const endpoint = `https://production-sfo.browserless.io/unblock?token=${token}&proxy=residential`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: target,
      content: true,
    }),
  });

  if (!res.ok) {
    throw new Error(`Pro Scan failed with status code ${res.status}`);
  }

  // /unblock returns JSON
  const data = await res.json().catch(() => ({}));

  // try common response shapes
  const html =
    data?.content ||
    data?.data?.content ||
    data?.html ||
    data?.body ||
    "";

  if (!html || typeof html !== "string") {
    throw new Error("Pro Scan returned empty HTML (still protected).");
  }

  return html;
}

function extractOutboundLinks(target: string, html: string) {
  const $ = cheerio.load(html);
  const targetDomain = getDomain(target);

  const links: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

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

  const uniqueLinks = Array.from(new Set(links));
  const outbound = uniqueLinks.filter(
    (l) => getDomain(l) && getDomain(l) !== targetDomain
  );

  const refDomains = new Set(outbound.map(getDomain).filter(Boolean));

  return { outbound, refDomains };
}

export async function POST(req: NextRequest) {
  try {
    const { url, mode } = await req.json();
    const target = normalizeUrl(url);
    const scanMode: Mode = mode === "pro" ? "pro" : "mvp";

    if (!target) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    let html = "";
    try {
      html = await fetchHtmlMvp(target);
    } catch (e: any) {
      // If MVP got blocked AND user requested pro, fallback to pro
      if (scanMode === "pro" && (e?.status === 403 || String(e?.message).includes("403"))) {
        html = await fetchHtmlPro(target);
      } else {
        throw e;
      }
    }

    const { outbound, refDomains } = extractOutboundLinks(target, html);

    const result: BacklinkResult = {
      target,
      totalBacklinks: outbound.length,
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
