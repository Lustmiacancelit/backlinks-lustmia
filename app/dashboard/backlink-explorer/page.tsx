"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import clsx from "clsx";
import {
  Search,
  ExternalLink,
  Link2,
  ShieldAlert,
  Activity,
  Filter,
} from "lucide-react";

/* ---------- types must match /api/backlinks ---------- */

type LinkType =
  | "editorial"
  | "directory"
  | "social"
  | "forum"
  | "ugc"
  | "sponsored"
  | "news"
  | "wiki"
  | "edu"
  | "gov"
  | "ecommerce"
  | "other";

type LinkDetail = {
  source_page: string;
  target_url: string;
  target_domain: string;
  anchor_text: string | null;
  rel: string | null;
  nofollow: boolean;
  sponsored: boolean;
  ugc: boolean;
  link_type: LinkType;
};

type BacklinkResult = {
  target: string;
  totalBacklinks: number;
  refDomains: number;
  sample: string[];

  pagesCrawled: number;
  uniqueOutbound: number;
  linksDetailed: LinkDetail[];
  errors: string[];
};

type Mode = "mvp" | "pro";

function getOrCreateUserId() {
  if (typeof window === "undefined") return "anon";
  const key = "lustmia_proscan_userid";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export default function BacklinkExplorerPage() {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<Mode>("pro"); // default deeper crawl
  const [userId, setUserId] = useState("anon");

  const [result, setResult] = useState<BacklinkResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUserId(getOrCreateUserId());
  }, []);

  async function runScan(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/backlinks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          mode,
          userId,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 403 || String(data?.error || "").includes("403")) {
          setError(
            "This site is protected. Try Pro mode or a different URL."
          );
          return;
        }
        throw new Error(data?.error || "Scan failed.");
      }

      setResult(data as BacklinkResult);
    } catch (err: any) {
      setError(err?.message || "Scan failed.");
    } finally {
      setLoading(false);
    }
  }

  const domainSummary = useMemo(() => {
    if (!result?.linksDetailed?.length) return [];

    const map: Record<
      string,
      {
        domain: string;
        links: number;
        follow: number;
        nofollow: number;
        sponsored: number;
        ugc: number;
        types: Partial<Record<LinkType, number>>;
      }
    > = {};

    for (const l of result.linksDetailed) {
      const dom = l.target_domain || safeHost(l.target_url);
      if (!dom) continue;
      if (!map[dom]) {
        map[dom] = {
          domain: dom,
          links: 0,
          follow: 0,
          nofollow: 0,
          sponsored: 0,
          ugc: 0,
          types: {},
        };
      }
      const bucket = map[dom];
      bucket.links++;
      if (l.nofollow) bucket.nofollow++;
      else bucket.follow++;
      if (l.sponsored) bucket.sponsored++;
      if (l.ugc) bucket.ugc++;
      bucket.types[l.link_type] = (bucket.types[l.link_type] || 0) + 1;
    }

    return Object.values(map).sort((a, b) => b.links - a.links);
  }, [result?.linksDetailed]);

  const typeLabelMap: Record<LinkType, string> = {
    editorial: "Editorial",
    directory: "Directory",
    social: "Social",
    forum: "Forum",
    ugc: "UGC",
    sponsored: "Sponsored",
    news: "News / Media",
    wiki: "Wiki",
    edu: "EDU",
    gov: "GOV",
    ecommerce: "E-commerce",
    other: "Other",
  };

  function dominantType(types: Partial<Record<LinkType, number>>): string {
    let best: LinkType | null = null;
    let max = -1;
    for (const [k, v] of Object.entries(types) as [LinkType, number][]) {
      if (v > max) {
        max = v;
        best = k;
      }
    }
    if (!best) return "Mixed";
    return typeLabelMap[best] || "Mixed";
  }

  return (
    <DashboardLayout active="backlink-explorer">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Backlink Explorer
          </h1>
          <p className="text-white/60 text-sm">
            Inspect individual backlinks, anchors, and link attributes from a
            single crawl.
          </p>
        </div>
      </header>

      {/* Scan controls + summary */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold flex items-center gap-2">
              <Search className="h-4 w-4 text-pink-400" />
              Run a backlink crawl
            </div>
            <div className="flex items-center gap-2 text-xs text-white/60">
              <span className="hidden sm:inline">Mode</span>
              <button
                type="button"
                onClick={() => setMode("mvp")}
                className={clsx(
                  "px-2 py-1 rounded-lg border text-[11px]",
                  mode === "mvp"
                    ? "bg-white/10 border-white/30"
                    : "bg-transparent border-white/10 hover:bg-white/5"
                )}
              >
                Basic
              </button>
              <button
                type="button"
                onClick={() => setMode("pro")}
                className={clsx(
                  "px-2 py-1 rounded-lg border text-[11px]",
                  mode === "pro"
                    ? "bg-gradient-to-r from-pink-500 to-indigo-500 border-transparent"
                    : "bg-transparent border-white/10 hover:bg-white/5"
                )}
              >
                Pro
              </button>
            </div>
          </div>

          <form
            onSubmit={runScan}
            className="flex flex-col md:flex-row gap-2"
          >
            <input
              type="url"
              required
              placeholder="https://yourdomain.com"
              className="flex-1 px-4 py-3 rounded-xl bg-[#0A0B11] border border-white/10 focus:outline-none focus:ring-2 focus:ring-pink-500"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-3 rounded-xl bg-pink-600 hover:bg-pink-500 font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? "Scanning…" : "Scan site"}
            </button>
          </form>

          {error && (
            <div className="mt-3 text-sm text-red-200 bg-red-900/30 border border-red-700/40 p-3 rounded-xl">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <StatPill
                label="Outbound backlinks"
                value={result.totalBacklinks}
                icon={<Link2 className="h-4 w-4 text-pink-300" />}
              />
              <StatPill
                label="Referring domains"
                value={result.refDomains}
                icon={<Activity className="h-4 w-4 text-indigo-300" />}
              />
              <StatPill
                label="Pages crawled"
                value={result.pagesCrawled}
                icon={<Filter className="h-4 w-4 text-cyan-300" />}
              />
              <StatPill
                label="Unique outbound URLs"
                value={result.uniqueOutbound}
                icon={<ShieldAlert className="h-4 w-4 text-emerald-300" />}
              />
            </div>
          )}
        </div>

        {/* Side explanation panel */}
        <div className="rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
          <div className="font-semibold flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-cyan-300" />
            How Explorer works
          </div>
          <ul className="text-xs text-white/70 space-y-1">
            <li>• Crawls your site from the URL you enter.</li>
            <li>• Finds outbound links, anchor text, and rel attributes.</li>
            <li>• Groups links by referring domain so you can spot patterns.</li>
            <li>• Use Pro mode for a deeper crawl and better coverage.</li>
          </ul>
        </div>
      </section>

      {/* Domain-level summary */}
      <section className="mb-6 rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Referring domains (grouped)</div>
          <div className="text-xs text-white/60">
            Top domains where your links live.
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-white/60">
              <tr className="border-b border-white/10">
                <th className="text-left py-2">Domain</th>
                <th className="text-left py-2">Links</th>
                <th className="text-left py-2">Follow</th>
                <th className="text-left py-2">Nofollow</th>
                <th className="text-left py-2">Sponsored</th>
                <th className="text-left py-2">UGC</th>
                <th className="text-left py-2">Dominant type</th>
              </tr>
            </thead>
            <tbody>
              {domainSummary.slice(0, 40).map((d) => (
                <tr key={d.domain} className="border-b border-white/5">
                  <td className="py-2 font-medium">{d.domain}</td>
                  <td className="py-2">{d.links}</td>
                  <td className="py-2">{d.follow}</td>
                  <td className="py-2">{d.nofollow}</td>
                  <td className="py-2">{d.sponsored}</td>
                  <td className="py-2">{d.ugc}</td>
                  <td className="py-2 text-white/70">
                    {dominantType(d.types)}
                  </td>
                </tr>
              ))}

              {!result && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-white/50"
                  >
                    Run a scan to see referring domains.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Raw links table */}
      <section className="mb-6 rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">All backlinks (raw view)</div>
          <div className="text-xs text-white/60">
            Up to 200 links per scan for now.
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs md:text-sm">
            <thead className="text-white/60">
              <tr className="border-b border-white/10">
                <th className="text-left py-2">Source page</th>
                <th className="text-left py-2">Anchor</th>
                <th className="text-left py-2">Target domain</th>
                <th className="text-left py-2">Flags</th>
                <th className="text-left py-2">Type</th>
              </tr>
            </thead>
            <tbody>
              {result?.linksDetailed?.slice(0, 200).map((link, i) => (
                <tr
                  key={link.source_page + link.target_url + i}
                  className="border-b border-white/5 align-top"
                >
                  <td className="py-2 max-w-xs md:max-w-md">
                    <a
                      href={link.source_page}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-pink-200 hover:text-pink-100 break-all"
                    >
                      {link.source_page}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                  <td className="py-2 max-w-xs break-words text-white/80">
                    {link.anchor_text || (
                      <span className="text-white/40">[no anchor]</span>
                    )}
                  </td>
                  <td className="py-2 text-white/80">
                    {link.target_domain || safeHost(link.target_url)}
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      {!link.nofollow && !link.sponsored && !link.ugc && (
                        <Tag>follow</Tag>
                      )}
                      {link.nofollow && <Tag>nofollow</Tag>}
                      {link.sponsored && <Tag>Sponsored</Tag>}
                      {link.ugc && <Tag>UGC</Tag>}
                    </div>
                  </td>
                  <td className="py-2 text-white/70">
                    {typeLabelMap[link.link_type] || "Other"}
                  </td>
                </tr>
              ))}

              {!result && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-8 text-center text-white/50"
                  >
                    Run a scan to see raw backlinks.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {result?.errors?.length ? (
          <div className="mt-3 text-xs text-amber-200 bg-amber-500/10 border border-amber-400/30 rounded-xl px-3 py-2">
            Some pages could not be crawled:
            <ul className="mt-1 list-disc list-inside space-y-0.5">
              {result.errors.slice(0, 5).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
              {result.errors.length > 5 && (
                <li>+ {result.errors.length - 5} more…</li>
              )}
            </ul>
          </div>
        ) : null}
      </section>
    </DashboardLayout>
  );
}

/* ---------- small UI helpers ---------- */

function StatPill({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 flex items-center gap-2">
      <div className="p-2 rounded-lg bg-black/40 border border-white/10">
        {icon}
      </div>
      <div>
        <div className="text-xs text-white/60">{label}</div>
        <div className="text-base font-semibold">{value}</div>
      </div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-1.5 py-0.5 rounded-lg text-[11px] bg-white/5 border border-white/20 text-white/70">
      {children}
    </span>
  );
}

function safeHost(link: string) {
  try {
    return new URL(link).hostname;
  } catch {
    return link;
  }
}
