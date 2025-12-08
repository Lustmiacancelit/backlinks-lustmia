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
  Globe,
  CalendarClock,
  ArrowUpRight,
  RefreshCw,
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

/* ---------- global index types (must match /api/backlink-index) ---------- */

type IndexDomainRow = {
  linking_domain: string;
  links_count: number;
  first_seen_at: string | null;
  last_seen_at: string | null;
};

type IndexLinkRow = {
  target_domain: string;
  linking_domain: string;
  linking_url: string;
  first_seen_at: string | null;
  last_seen_at: string | null;
  total_scans_seen: number;
};

type IndexTotals = {
  totalLinks: number;
  refDomains: number;
  oldest: string | null;
  newest: string | null;
};

type IndexResponse = {
  ok: boolean;
  targetDomain: string;
  totals: IndexTotals;
  byDomain: IndexDomainRow[];
  latestLinks: IndexLinkRow[];
};

/* ---------- helpers ---------- */

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

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return d;
  }
}

function formatAge(d: string | null | undefined) {
  if (!d) return "—";
  const dt = new Date(d);
  const now = new Date();
  const diff = now.getTime() - dt.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1 month ago";
  return `${months} months ago`;
}

export default function BacklinkExplorerPage() {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<Mode>("pro"); // default deeper crawl
  const [userId, setUserId] = useState("anon");

  const [result, setResult] = useState<BacklinkResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Global index state
  const [indexData, setIndexData] = useState<IndexResponse | null>(null);
  const [indexLoading, setIndexLoading] = useState(false);
  const [indexError, setIndexError] = useState<string | null>(null);

  useEffect(() => {
    setUserId(getOrCreateUserId());
  }, []);

  async function loadGlobalIndex(domain: string) {
    const trimmed = domain.trim();
    if (!trimmed) return;

    setIndexLoading(true);
    setIndexError(null);

    try {
      const params = new URLSearchParams({ d: trimmed });
      const res = await fetch(`/api/backlink-index?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || "Failed to load backlink index.");
      }

      setIndexData(json as IndexResponse);
    } catch (e: any) {
      setIndexError(e?.message || "Failed to load backlink index.");
      setIndexData(null);
    } finally {
      setIndexLoading(false);
    }
  }

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

      const typed = data as BacklinkResult;
      setResult(typed);

      // Kick off global index load based on the target domain
      const domain = safeHost(typed.target)?.replace(/^www\./, "");
      if (domain) {
        // fire-and-forget; we don't await so UI stays snappy
        loadGlobalIndex(domain);
      }
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

  const totals = indexData?.totals;
  const indexByDomain = indexData?.byDomain ?? [];
  const indexLatest = indexData?.latestLinks ?? [];

  return (
    <DashboardLayout active="backlink-explorer">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Backlink Explorer
          </h1>
          <p className="text-white/60 text-sm">
            Inspect individual backlinks from a single crawl, plus your always-on
            global backlink index built from all scans.
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

          <form onSubmit={runScan} className="flex flex-col md:flex-row gap-2">
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
                label="Referring domains (this crawl)"
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
            <li>• Global index aggregates all scans over time.</li>
          </ul>
        </div>
      </section>

      {/* Domain-level summary (single crawl) */}
      <section className="mb-6 rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">
            Referring domains from this crawl
          </div>
          <div className="text-xs text-white/60">
            Top domains where your links were found in the last scan.
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
                  <td colSpan={7} className="py-8 text-center text-white/50">
                    Run a scan to see referring domains for this crawl.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Global Backlink Index (all scans) */}
      <section className="mb-6 rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-semibold flex items-center gap-2">
              <Globe className="h-4 w-4 text-pink-400" />
              Global Backlink Index (all scans)
            </div>
            <div className="text-xs text-white/60 mt-1">
              Aggregated backlinks we&apos;ve seen for this domain across all
              scans.
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 text-xs text-white/60">
            {indexData?.targetDomain && (
              <div>
                Domain:{" "}
                <span className="text-white">
                  {indexData.targetDomain}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                const d =
                  indexData?.targetDomain ||
                  (result ? safeHost(result.target)?.replace(/^www\./, "") : "");
                if (d) loadGlobalIndex(d);
              }}
              disabled={indexLoading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-60"
            >
              <RefreshCw
                className={clsx(
                  "h-3 w-3",
                  indexLoading && "animate-spin"
                )}
              />
              Refresh index
            </button>
          </div>
        </div>

        {indexError && (
          <div className="mb-3 text-sm text-red-200 bg-red-900/30 border border-red-700/40 p-3 rounded-xl">
            {indexError}
          </div>
        )}

        {!indexData && !indexLoading && !indexError && (
          <div className="mb-3 text-sm text-white/60">
            No global index data loaded yet. Run a scan first, or click{" "}
            <span className="font-semibold">Refresh index</span> to fetch data
            if it already exists.
          </div>
        )}

        {indexLoading && (
          <div className="mb-3 text-sm text-white/60 flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading global index…
          </div>
        )}

        {indexData && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <IndexKpi
                icon={<Link2 className="h-5 w-5 text-pink-300" />}
                label="Total backlinks in index"
                value={totals?.totalLinks ?? 0}
              />
              <IndexKpi
                icon={<Globe className="h-5 w-5 text-indigo-300" />}
                label="Referring domains in index"
                value={totals?.refDomains ?? 0}
              />
              <IndexKpi
                icon={<CalendarClock className="h-5 w-5 text-cyan-300" />}
                label="Oldest link age"
                valueText={formatAge(totals?.oldest || null)}
              />
              <IndexKpi
                icon={<CalendarClock className="h-5 w-5 text-emerald-300" />}
                label="Most recent link"
                valueText={formatAge(totals?.newest || null)}
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {/* Domains in index */}
              <div className="xl:col-span-2">
                <div className="text-xs text-white/60 mb-1">
                  Top referring domains in your global index.
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-white/60 border-b border-white/10">
                      <tr>
                        <th className="text-left py-2">
                          Referring domain
                        </th>
                        <th className="text-left py-2">
                          Links in index
                        </th>
                        <th className="text-left py-2">First seen</th>
                        <th className="text-left py-2">Last seen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {indexByDomain.slice(0, 50).map((row) => (
                        <tr
                          key={row.linking_domain}
                          className="border-b border-white/5"
                        >
                          <td className="py-2 font-medium">
                            {row.linking_domain || "Unknown"}
                          </td>
                          <td className="py-2">
                            {row.links_count}
                          </td>
                          <td className="py-2 text-white/70">
                            {formatDate(row.first_seen_at)}{" "}
                            <span className="text-white/40 ml-1">
                              ({formatAge(row.first_seen_at)})
                            </span>
                          </td>
                          <td className="py-2 text-white/70">
                            {formatDate(row.last_seen_at)}{" "}
                            <span className="text-white/40 ml-1">
                              ({formatAge(row.last_seen_at)})
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Latest links */}
              <div>
                <div className="text-xs text-white/60 mb-1">
                  Latest backlinks detected in the index.
                </div>
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {indexLatest.map((link, i) => (
                    <a
                      key={link.linking_url + i}
                      href={link.linking_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="text-xs font-semibold">
                          {link.linking_domain}
                        </div>
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-200 border border-emerald-400/30">
                          <ArrowUpRight className="h-3 w-3" />
                          Visit
                        </span>
                      </div>
                      <div className="text-[11px] text-white/60 break-all mb-1">
                        {link.linking_url}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-white/50">
                        <span>
                          First:{" "}
                          <span className="text-white">
                            {formatDate(link.first_seen_at)}
                          </span>
                        </span>
                        <span>
                          Last:{" "}
                          <span className="text-white">
                            {formatDate(link.last_seen_at)}
                          </span>
                        </span>
                      </div>
                    </a>
                  ))}

                  {!indexLatest.length && (
                    <div className="text-xs text-white/50">
                      No backlinks recorded in the index yet for this
                      domain.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Raw links table (single crawl) */}
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
                      <span className="text-white/40">
                        [no anchor]
                      </span>
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
                  <td colSpan={5} className="py-8 text-center text-white/50">
                    Run a scan to see raw backlinks for this crawl.
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

function IndexKpi({
  icon,
  label,
  value,
  valueText,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
  valueText?: string;
}) {
  const display =
    typeof value === "number"
      ? value.toLocaleString()
      : valueText || "—";

  return (
    <div className="rounded-2xl p-4 bg-black/40 border border-white/10 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 rounded-xl bg-white/5 border border-white/10">
          {icon}
        </div>
      </div>
      <div className="text-xl font-bold mb-1">{display}</div>
      <div className="text-xs text-white/60">{label}</div>
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
