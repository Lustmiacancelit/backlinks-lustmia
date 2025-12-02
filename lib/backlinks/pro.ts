// lib/backlinks/pro.ts
import type { BacklinkResult } from "@/types/backlinks";
import { chromium } from "playwright"; // or 'playwright-core' if you prefer

type CrawlOptions = {
  maxPages?: number;
  sameDomainOnly?: boolean;
};

export async function runProScan(
  url: string,
  options: CrawlOptions = {}
): Promise<BacklinkResult> {
  const { maxPages = 5, sameDomainOnly = true } = options;

  const browser = await chromium.launch({
    headless: true,
  });

  const page = await browser.newPage();
  const visited = new Set<string>();
  const toVisit: string[] = [url];

  const backlinks = new Set<string>();

  const baseHost = new URL(url).hostname;

  while (toVisit.length && visited.size < maxPages) {
    const current = toVisit.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    try {
      await page.goto(current, { waitUntil: "networkidle", timeout: 45_000 });

      const linksOnPage = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
          .map((a) => a.href)
          .filter(Boolean)
      );

      for (const l of linksOnPage) {
        try {
          const u = new URL(l);
          // outbound link
          if (u.hostname !== baseHost) {
            backlinks.add(u.toString());
          } else if (sameDomainOnly && !visited.has(u.toString())) {
            // internal page for deeper crawl
            toVisit.push(u.toString());
          }
        } catch {
          // ignore invalid URLs
        }
      }
    } catch {
      // ignore failed pages but keep crawling
    }
  }

  await browser.close();

  const links = Array.from(backlinks);
  const refDomains = new Set(
    links.map((l) => {
      try {
        return new URL(l).hostname;
      } catch {
        return null;
      }
    }).filter(Boolean) as string[]
  );

  return {
    target: url,
    totalBacklinks: links.length,
    refDomains: refDomains.size,
    sample: links.slice(0, 50), // Pro gets deeper sample
  };
}
