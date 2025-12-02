// lib/backlinks/mvp.ts
import type { BacklinkResult } from "@/types/backlinks"; // or reuse your local type

export async function runMvpScan(url: string): Promise<BacklinkResult> {
  const res = await fetch(url, { redirect: "follow" });

  if (!res.ok) {
    throw new Error(`MVP scan failed with status ${res.status}`);
  }

  const html = await res.text();

  // very simple link extract – replace with your real logic if you already have it
  const linkRegex = /href="([^"]+)"/g;
  const links: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(html))) {
    const candidate = match[1];
    if (!candidate.startsWith("http")) continue;
    // avoid duplicates
    if (!links.includes(candidate)) links.push(candidate);
  }

  // simple domain aggregation
  const domains = new Set(
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
    refDomains: domains.size,
    sample: links.slice(0, 20),
  };
}
