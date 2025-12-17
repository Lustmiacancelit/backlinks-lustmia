"use client";

import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart as RePieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Search,
  Link2,
  Activity,
  ShieldAlert,
  TrendingUp,
  Globe,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Zap,
  FileDown,
  AlertTriangle,
  Target,
  PieChart as PieChartIcon,
} from "lucide-react";
import clsx from "clsx";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

/* ---------- types from API ---------- */

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

const LINK_TYPE_LABELS: Record<LinkType, string> = {
  editorial: "Editorial",
  directory: "Directory",
  social: "Social",
  forum: "Forum / Community",
  ugc: "UGC",
  sponsored: "Sponsored",
  news: "News / Media",
  wiki: "Wiki",
  edu: "EDU",
  gov: "GOV",
  ecommerce: "E-commerce",
  other: "Other",
};

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

type AiLinkInsight = {
  target_url: string;
  target_domain: string;
  anchor_text: string | null;
  link_type: LinkType;
  toxicity: "low" | "medium" | "high";
  spam_risk: number;
  anchor_category: "branded" | "generic" | "money" | "cta" | "other";
  note?: string;
};

type AiInsights = {
  summary: string;
  toxicityNotes: string | string[];
  outreachIdeas: string | string[];
  competitorGaps: string | string[];
  linkInsights: AiLinkInsight[];
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

  aiInsights?: AiInsights | null;
};

/** NEW: Site Health AI payload (from /api/site-health) */
type SiteHealthAI = {
  authority: number; // 0-100
  velocity: number; // 0-100
  spamRisk: number; // 0-100
  summary?: string;
};

/** NEW: Dashboard summary payload (decision-first KPIs) */
type DashboardSummary = {
  target: string;
  kpis: {
    total_backlinks: number;
    ref_domains: number;
    negative_impact_links: number;
    growth_score: number;
    net_impact_change_7d?: number;
  };
};

/** NEW: Trend payload (impact-weighted series) */
type ImpactTrend = {
  target: string;
  series: { date: string; net_impact: number }[];
};

/** NEW: Next Actions payload (“What Matters Right Now”) */
type NextActionsResponse = {
  target: string;
  items: Array<{
    type:
      | "RESTORE_PAGE"
      | "FIX_REDIRECT"
      | "CONSOLIDATE_DUPLICATES"
      | "REMOVE_BLOCKER"
      | "IGNORE";
    priority: number;
    summary: string;
    estimated_impact: "HIGH" | "MEDIUM" | "LOW";
    confidence: number; // 0..1
    affected_urls?: string[];
  }>;
};

type Mode = "mvp" | "pro";

type Quota = {
  usedToday: number;
  limit: number;
  remaining: number;
  resetAt: string | null;
  isPro?: boolean;
  plan?: string;
  status?: string;
  demoUser?: boolean;
};

function normalizeQuota(d: any): Quota | null {
  if (!d) return null;
  if (d.quota) d = d.quota;

  if (typeof d.remaining === "number" || typeof d.usedToday === "number") {
    const limit = Number(d.limit || 0);
    const usedToday = Number(d.usedToday || 0);
    const remaining =
      typeof d.remaining === "number"
        ? d.remaining
        : Math.max(0, limit - usedToday);

    return {
      usedToday,
      limit,
      remaining,
      resetAt: d.resetAt ?? null,
      isPro: d.isPro,
      plan: d.plan,
      status: d.status,
      demoUser: d.demoUser,
    };
  }

  if (typeof d.used === "number") {
    const limit = Number(d.limit || 0);
    const usedToday = Number(d.used || 0);
    return {
      usedToday,
      limit,
      remaining: Math.max(0, limit - usedToday),
      resetAt: d.resetAt ? new Date(d.resetAt).toISOString() : null,
    };
  }

  return null;
}

/**
 * Safely normalize any AI field (string | string[] | undefined) into string[]
 * so we can always `.map` without crashing.
 */
function normalizeList(value: string | string[] | null | undefined): string[] {
  if (Array.isArray(value)) {
    return value.filter((v) => typeof v === "string" && v.trim().length > 0);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n|•|-|\d+\./g)
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
  }

  return [];
}

const mockTrend = [
  { day: "Mon", links: 12 },
  { day: "Tue", links: 18 },
  { day: "Wed", links: 10 },
  { day: "Thu", links: 24 },
  { day: "Fri", links: 21 },
  { day: "Sat", links: 29 },
  { day: "Sun", links: 32 },
];

const mockScans = [
  { domain: "lustmia.com", links: 124, ref: 38, change: +6, time: "2h ago" },
  { domain: "example.com", links: 58, ref: 17, change: -2, time: "Yesterday" },
  {
    domain: "competitor.io",
    links: 201,
    ref: 64,
    change: +12,
    time: "2 days ago",
  },
];

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

function toDomainOrUrl(input: string) {
  const v = (input || "").trim();
  if (!v) return "";
  try {
    return new URL(v).hostname;
  } catch {
    return v.replace(/^https?:\/\//, "").split("/")[0];
  }
}

export default function Dashboard() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacklinkResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("mvp");

  const [userId, setUserId] = useState("anon");
  const [quota, setQuota] = useState<Quota | null>(null);
  const [recentScans, setRecentScans] = useState<any[]>([]);

  const [displayName, setDisplayName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  /** NEW: Site Health AI state */
  const [siteHealth, setSiteHealth] = useState<SiteHealthAI | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  /** NEW: decision-first dashboard data */
  const [dashSummary, setDashSummary] = useState<DashboardSummary | null>(null);
  const [impactTrend, setImpactTrend] = useState<ImpactTrend | null>(null);
  const [nextActions, setNextActions] = useState<NextActionsResponse | null>(
    null
  );

  // INTERNAL OVERRIDE: treat sales@lustmia.com as “always Pro”
  const isInternal =
    userEmail?.toLowerCase() === "sales@lustmia.com" ||
    userEmail?.toLowerCase() === "sales@lustmia.com.br";

  const remaining = quota?.remaining ?? 0;
  const planName = quota?.plan ?? (isInternal ? "internal" : "free");
  const isProUser = !!quota?.isPro || isInternal;

  // Internal user can always use Pro Scan (ignore remaining)
  const canUseProScan = isInternal || (isProUser && remaining > 0);

  useEffect(() => {
    supabaseBrowserClient.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) return;

      const user = data.user;
      const meta: any = user.user_metadata || {};
      const email = user.email || "";
      setUserEmail(email || null);

      const first =
        meta.first_name ||
        meta.firstName ||
        meta.given_name ||
        (meta.full_name ? String(meta.full_name).split(" ")[0] : "");
      const last =
        meta.last_name ||
        meta.lastName ||
        meta.family_name ||
        (meta.full_name
          ? String(meta.full_name).split(" ").slice(1).join(" ")
          : "");

      const name = `${first || ""} ${last || ""}`.trim() || email || null;
      if (name) setDisplayName(name);
    });

    const id = getOrCreateUserId();
    setUserId(id);

    fetch(`/api/proscan/quota?u=${id}`)
      .then((r) => r.json())
      .then((d) => {
        const q = normalizeQuota(d);
        if (q) setQuota(q);
      })
      .catch(() => {});

    fetch(`/api/scans/recent?u=${id}`)
      .then((r) => r.json())
      .then((d) => setRecentScans(d.scans || []))
      .catch(() => {});
  }, []);

  /** NEW: load decision-first endpoints for the dashboard */
  async function loadDecisionDashboard(targetDomainOrUrl: string) {
    const target = toDomainOrUrl(targetDomainOrUrl);
    if (!target) return;

    try {
      fetch(`/api/v1/dashboard/summary?target=${encodeURIComponent(target)}`)
        .then((r) => r.json())
        .then((d) => {
          if (d?.kpis) setDashSummary(d);
        })
        .catch(() => {});

      fetch(
        `/api/v1/dashboard/impact-trend?target=${encodeURIComponent(
          target
        )}&days=7`
      )
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d?.series)) setImpactTrend(d);
        })
        .catch(() => {});

      fetch(`/api/v1/actions/next?target=${encodeURIComponent(target)}`)
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d?.items)) setNextActions(d);
        })
        .catch(() => {});
    } catch {
      // silent fail; UI falls back to existing behavior
    }
  }

  /** NEW: Load Site Health AI after scan (server computes metrics) */
  async function loadSiteHealth(domainOrUrl: string) {
    if (!domainOrUrl) return;
    setHealthLoading(true);
    try {
      // NEW: prefer decision-first health AI summary if available
      try {
        const target = toDomainOrUrl(domainOrUrl);
        const r2 = await fetch(
          `/api/v1/health/ai-summary?target=${encodeURIComponent(target)}`
        );
        const d2 = await r2.json().catch(() => null);
        if (r2.ok && d2?.bars) {
          setSiteHealth({
            authority: Number(d2?.bars?.authority_trend?.value ?? 0),
            velocity: Number(d2?.bars?.backlink_velocity?.value ?? 0),
            spamRisk: Number(d2?.bars?.spam_risk?.value ?? 0),
            summary: typeof d2?.tip === "string" ? d2.tip : undefined,
          });
          setHealthLoading(false);
          return;
        }
      } catch {
        // fall back to /api/site-health below
      }

      const res = await fetch(
        `/api/site-health?domain=${encodeURIComponent(domainOrUrl)}`
      );
      const data = await res.json().catch(() => null);

      if (res.ok && data) {
        setSiteHealth({
          authority: Number(data.authority ?? 0),
          velocity: Number(data.velocity ?? 0),
          spamRisk: Number(data.spamRisk ?? 0),
          summary: typeof data.summary === "string" ? data.summary : undefined,
        });
      } else {
        setSiteHealth(null);
      }
    } catch {
      setSiteHealth(null);
    } finally {
      setHealthLoading(false);
    }
  }

  /** NEW: trigger Site Health once a scan result exists */
  useEffect(() => {
    if (!result?.target) return;
    loadSiteHealth(result.target);
    loadDecisionDashboard(result.target); // NEW
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.target]);

  async function consumeProScanIfNeeded(scanMode: Mode) {
    if (scanMode !== "pro") return true;

    if (isInternal) {
      return true;
    }

    const r = await fetch(`/api/proscan/quota?u=${userId}`);
    const d = await r.json().catch(() => ({}));
    const q = normalizeQuota(d);

    if (q) setQuota(q);

    if (!r.ok) {
      setError(d?.error || "Unable to check Pro Scan quota.");
      return false;
    }

    if (!q?.isPro) {
      setError("Pro Scan is only available on paid plans. Upgrade to unlock.");
      return false;
    }

    if ((q.remaining ?? 0) <= 0) {
      setError("Pro Scan limit reached for today.");
      return false;
    }

    return true;
  }

  async function quickScan(e?: React.FormEvent, forcedMode?: Mode) {
    if (e) e.preventDefault();

    const effectiveMode: Mode = forcedMode ?? mode;

    setLoading(true);
    setError(null);
    setResult(null);

    // reset Site Health each scan (prevents stale health display)
    setSiteHealth(null);

    // reset decision-first states each scan (prevents stale display)
    setDashSummary(null);
    setImpactTrend(null);
    setNextActions(null);

    const cleanedUrl = url.trim();

    try {
      const allowed = await consumeProScanIfNeeded(effectiveMode);
      if (!allowed) return;

      const res = await fetch("/api/backlinks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleanedUrl, mode: effectiveMode, userId }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 403 || String(data?.error || "").includes("403")) {
          setError("Protected site detected. Try Pro Scan or a different site.");
          return;
        }
        throw new Error(data?.error || "Scan failed.");
      }

      setResult(data);
      setMode(effectiveMode);

      if (effectiveMode === "pro" && !isInternal) {
        fetch(`/api/proscan/quota?u=${userId}`)
          .then((r) => r.json())
          .then((d) => {
            const q = normalizeQuota(d);
            if (q) setQuota(q);
          })
          .catch(() => {});
      }

      fetch(`/api/scans/recent?u=${userId}`)
        .then((r) => r.json())
        .then((d) => setRecentScans(d.scans || []))
        .catch(() => {});
    } catch (err: any) {
      setError(err?.message || "Scan failed.");
    } finally {
      setLoading(false);
    }
  }

  async function runScan(scanMode: Mode) {
    setMode(scanMode);
    await quickScan(undefined, scanMode);
  }

  const kpis = useMemo(() => {
    // Prefer decision-first KPIs when available
    if (dashSummary?.kpis) {
      const links = Number(dashSummary.kpis.total_backlinks ?? 0);
      const ref = Number(dashSummary.kpis.ref_domains ?? 0);
      const toxic = Number(dashSummary.kpis.negative_impact_links ?? 0); // NEW meaning
      const growth = Number(dashSummary.kpis.growth_score ?? 0);
      return { links, ref, toxic, growth };
    }

    // Fallback to old estimation
    const links = result?.totalBacklinks ?? 0;
    const ref = result?.refDomains ?? 0;
    const toxic = Math.max(0, Math.round(links * 0.06));
    const growth = links === 0 ? 0 : Math.round((links / Math.max(1, ref)) * 8);
    return { links, ref, toxic, growth };
  }, [result, dashSummary]);

  // Map domain -> AI toxicity + anchor summary
  const domainAi = useMemo(() => {
    const map = new Map<
      string,
      {
        toxicity: AiLinkInsight["toxicity"];
        spam_risk: number;
        anchor_category: string;
      }
    >();
    if (!result?.aiInsights?.linkInsights) return map;

    for (const li of result.aiInsights.linkInsights) {
      const dom = (li.target_domain || safeHost(li.target_url)).toLowerCase();
      if (!dom) continue;
      const existing = map.get(dom);
      if (!existing || li.spam_risk > existing.spam_risk) {
        map.set(dom, {
          toxicity: li.toxicity,
          spam_risk: li.spam_risk,
          anchor_category: li.anchor_category,
        });
      }
    }
    return map;
  }, [result?.aiInsights]);

  // Pie chart data for backlink composition
  const linkPieData = useMemo(() => {
    if (!result?.linksDetailed?.length) return [];
    const counts: Partial<Record<LinkType, number>> = {};

    for (const l of result.linksDetailed) {
      counts[l.link_type] = (counts[l.link_type] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([type, value]) => ({
        name: LINK_TYPE_LABELS[type as LinkType] || type,
        value: value as number,
      }))
      .filter((d) => d.value > 0);
  }, [result?.linksDetailed]);

  const sampleLinks = useMemo(
    () => (result?.linksDetailed ?? []).slice(0, 8),
    [result?.linksDetailed]
  );

  const trendData = useMemo(() => {
    if (impactTrend?.series?.length) {
      return impactTrend.series.map((p) => ({
        day: new Date(p.date).toLocaleDateString(undefined, { weekday: "short" }),
        links: p.net_impact,
      }));
    }
    return mockTrend;
  }, [impactTrend]);

  return (
    <DashboardLayout active="overview">
      {/* TOPBAR */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          {displayName && (
            <p className="text-sm text-white/70 mb-0.5">Hi {displayName} 👋</p>
          )}
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Backlinks Dashboard
          </h1>
          <p className="text-white/60 text-sm">
            Track backlinks, referring domains, toxicity & growth — Lustmia
            style.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-white/10"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.print();
              }
            }}
          >
            <FileDown className="h-4 w-4 mr-1" />
            Export PDF
          </button>
          <button className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-white/10">
            Alerts
          </button>
        </div>
      </div>

      {/* QUICK SCAN */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-semibold flex items-center gap-2">
                <Search className="h-4 w-4 text-pink-400" />
                Quick Scan
              </div>
              <div className="text-xs text-white/50 mt-1">
                Plan: <span className="uppercase">{planName}</span>{" "}
                {isProUser ? "· Pro scans included" : "· Pro scans locked"}
              </div>
            </div>

            <div className="text-xs text-white/60 flex flex-col items-end gap-1">
              <span>
                {mode === "pro"
                  ? "Pro Scan — bypass protected sites"
                  : "MVP v1 — visible outbound links"}
              </span>

              <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                {isInternal ? (
                  <>Internal account · unlimited testing</>
                ) : isProUser ? (
                  <>
                    Pro scans left today: <b>{remaining}</b>
                  </>
                ) : (
                  <>Upgrade to unlock Pro Scans</>
                )}
              </span>
            </div>
          </div>

          <form
            onSubmit={(e) => quickScan(e)}
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
              type="button"
              onClick={() => runScan("mvp")}
              disabled={loading}
              className={clsx(
                "px-4 py-3 rounded-xl font-semibold border text-sm",
                mode === "mvp"
                  ? "bg-white/10 border-white/20"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              )}
            >
              {loading && mode === "mvp" ? "Scanning..." : "Scan"}
            </button>

            <button
              type="button"
              onClick={() => runScan("pro")}
              disabled={loading || (!canUseProScan && !isInternal)}
              className={clsx(
                "flex items-center gap-2 px-5 py-3 rounded-xl font-semibold",
                !canUseProScan && !isInternal
                  ? "bg-white/5 border border-white/10 text-white/40 cursor-not-allowed"
                  : "bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500 hover:opacity-90"
              )}
            >
              <Zap className="h-4 w-4" />
              {loading && mode === "pro" ? "Pro Scanning..." : "Pro Scan"}
            </button>
          </form>

          {error && (
            <div className="mt-3 text-sm text-red-200 bg-red-900/30 border border-red-700/40 p-3 rounded-xl">
              {error}
            </div>
          )}

          {/* NEW: What Matters Right Now (decision-first) */}
          {nextActions?.items?.length ? (
            <div className="mt-4 rounded-2xl p-4 bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4 text-emerald-300" />
                  What matters right now
                </div>
                <div className="text-[11px] text-white/60">
                  confidence{" "}
                  {Math.round((nextActions.items[0]?.confidence ?? 0) * 100)}%
                </div>
              </div>

              <div className="space-y-2">
                {nextActions.items.slice(0, 3).map((a, idx) => (
                  <div
                    key={`${a.type}-${idx}`}
                    className="p-3 rounded-xl bg-black/30 border border-white/10"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold">
                        #{a.priority} · {a.type.replaceAll("_", " ")}
                      </div>
                      <span
                        className={clsx(
                          "text-[11px] px-2 py-1 rounded-lg border",
                          a.estimated_impact === "HIGH"
                            ? "bg-emerald-500/15 text-emerald-200 border-emerald-400/20"
                            : a.estimated_impact === "MEDIUM"
                            ? "bg-amber-500/15 text-amber-200 border-amber-400/20"
                            : "bg-white/5 text-white/70 border-white/10"
                        )}
                      >
                        {a.estimated_impact}
                      </span>
                    </div>
                    <div className="text-xs text-white/70 mt-1">{a.summary}</div>

                    {a.affected_urls?.length ? (
                      <div className="mt-2 text-[11px] text-white/60">
                        Affected: {a.affected_urls.slice(0, 3).join(", ")}
                        {a.affected_urls.length > 3 ? "…" : ""}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {result && (
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
              <MiniStat label="Backlinks" value={kpis.links} />
              <MiniStat label="Ref. Domains" value={kpis.ref} />
              <MiniStat label="Toxic (est.)" value={kpis.toxic} />

              {/* PIE CHART – backlink composition */}
              <div className="lg:col-span-1 rounded-xl p-3 bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <PieChartIcon className="h-4 w-4 text-pink-300" />
                    Backlink mix
                  </div>
                  <div className="text-[11px] text-white/50">by link type</div>
                </div>
                {linkPieData.length ? (
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={linkPieData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={32}
                          outerRadius={60}
                          paddingAngle={3}
                        >
                          {linkPieData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                [
                                  "#ec4899",
                                  "#a855f7",
                                  "#22c55e",
                                  "#38bdf8",
                                  "#eab308",
                                  "#f97316",
                                  "#f97373",
                                ][index % 7]
                              }
                            />
                          ))}
                        </Pie>
                        <Legend
                          layout="vertical"
                          align="right"
                          verticalAlign="middle"
                          formatter={(value) => (
                            <span className="text-[11px] text-white/70">
                              {value}
                            </span>
                          )}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#0A0B11",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 12,
                          }}
                        />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-xs text-white/60">
                    Run a scan to see the breakdown of editorial, directory,
                    social and other links.
                  </p>
                )}
              </div>

              {/* SAMPLE BACKLINKS – richer cards */}
              <div className="lg:col-span-2 mt-2">
                <div className="text-xs text-white/60 mb-1">
                  Sample backlinks from this scan
                </div>
                {sampleLinks.length ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {sampleLinks.map((link, i) => {
                      const host = link.target_domain || safeHost(link.target_url);
                      const domainKey = host.toLowerCase();
                      const ai = domainAi.get(domainKey);

                      let qualityLabel = "Good link";
                      let qualityClass =
                        "bg-emerald-500/15 text-emerald-200 border-emerald-400/30";

                      const spam = ai?.spam_risk ?? 0;
                      const tox = ai?.toxicity;

                      if (tox === "high" || spam >= 70) {
                        qualityLabel = "Risky link";
                        qualityClass =
                          "bg-red-500/20 text-red-100 border-red-500/40";
                      } else if (
                        tox === "medium" ||
                        spam >= 40 ||
                        link.nofollow ||
                        link.sponsored
                      ) {
                        qualityLabel = "Monitor";
                        qualityClass =
                          "bg-amber-500/15 text-amber-100 border-amber-400/30";
                      }

                      const typeLabel = LINK_TYPE_LABELS[link.link_type] || "Other";

                      return (
                        <a
                          key={i}
                          href={link.target_url}
                          target="_blank"
                          className="group text-sm bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-1 hover:bg-white/10 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-medium truncate">{host}</div>
                              <div className="text-[11px] text-white/60 truncate">
                                {link.target_url}
                              </div>
                            </div>
                            <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-60 group-hover:opacity-100" />
                          </div>

                          {link.anchor_text && (
                            <div className="text-[11px] text-white/70 mt-1 line-clamp-2">
                              “{link.anchor_text}”
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-2 text-[11px]">
                            <span className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/15">
                              {typeLabel}
                              {link.nofollow ? " · nofollow" : ""}
                            </span>
                            <span
                              className={clsx(
                                "px-2 py-0.5 rounded-lg border inline-flex items-center gap-1",
                                qualityClass
                              )}
                            >
                              <ShieldAlert className="h-3 w-3" />
                              {qualityLabel}
                            </span>
                          </div>

                          <div className="mt-1 text-[10px] text-white/50">
                            Detected in this scan · {new Date().toLocaleDateString()}
                          </div>
                        </a>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-white/60">
                    No outbound backlinks detected on the crawled pages yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Health Panel */}
        <div className="rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
          <div className="font-semibold flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-cyan-300" />
            Site Health (AI)
          </div>

          {/* NEW: Dynamic site health instead of hardcoded */}
          {healthLoading && (
            <div className="text-xs text-white/60">Analyzing site health…</div>
          )}

          {!healthLoading && siteHealth && (
            <div className="space-y-3">
              <HealthRow label="Authority Trend" score={siteHealth.authority} color="pink" />
              <HealthRow label="Backlink Velocity" score={siteHealth.velocity} color="cyan" />
              <HealthRow label="Spam Risk" score={siteHealth.spamRisk} color="red" invert />
            </div>
          )}

          {!healthLoading && !siteHealth && (
            <div className="space-y-3">
              <HealthRow label="Authority Trend" score={76} color="pink" />
              <HealthRow label="Backlink Velocity" score={68} color="cyan" />
              <HealthRow label="Spam Risk" score={14} color="red" invert />
            </div>
          )}

          <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white/70">
            AI tips unlocked in Pro: toxic detection, outreach suggestions,
            competitor gaps.
            {siteHealth?.summary ? (
              <div className="mt-2 text-white/60 whitespace-pre-line">
                {siteHealth.summary}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* AI Insights Panel */}
      {result?.aiInsights && (
        <section className="mb-6 rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-pink-500/20 flex items-center justify-center">
                <SparkleDot />
              </div>
              <div>
                <div className="text-sm font-semibold">AI Insights</div>
                <div className="text-xs text-white/60">
                  Summary, toxicity & competitor gaps generated from this scan.
                </div>
              </div>
            </div>
            <button
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10"
              onClick={() => {
                if (typeof window !== "undefined") window.print();
              }}
            >
              <FileDown className="h-3 w-3" />
              Export summary (PDF)
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs md:text-sm">
            <div>
              <h3 className="font-semibold mb-1">Summary</h3>
              <p className="text-white/70 whitespace-pre-line">
                {result.aiInsights.summary}
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-red-300" />
                Toxicity Notes
              </h3>
              <p className="text-white/70 whitespace-pre-line">
                {normalizeList(result.aiInsights.toxicityNotes).join("\n")}
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-1 flex items-center gap-1">
                <Target className="h-3 w-3 text-emerald-300" />
                Outreach Ideas
              </h3>
              <ul className="list-disc list-inside space-y-0.5 text-white/70">
                {normalizeList(result.aiInsights.outreachIdeas).map((idea, i) => (
                  <li key={i}>{idea}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-1">Competitor Gaps</h3>
              <ul className="list-disc list-inside space-y-0.5 text-white/70">
                {normalizeList(result.aiInsights.competitorGaps).map((gap, i) => (
                  <li key={i}>{gap}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KPI
          icon={<Link2 className="h-5 w-5 text-pink-300" />}
          label="Total Backlinks"
          value={kpis.links}
          delta="+12%"
        />
        <KPI
          icon={<Globe className="h-5 w-5 text-indigo-300" />}
          label="Referring Domains"
          value={kpis.ref}
          delta="+5%"
        />
        <KPI
          icon={<ShieldAlert className="h-5 w-5 text-red-300" />}
          label="Toxic Links"
          value={kpis.toxic}
          delta="-2%"
          negative
        />
        <KPI
          icon={<TrendingUp className="h-5 w-5 text-cyan-300" />}
          label="Growth Score"
          value={kpis.growth}
          delta="+9%"
        />
      </section>

      {/* CHART + TABLE */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Trend Chart */}
        <div className="xl:col-span-2 rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Backlink Growth (7 days)</div>
            <div className="text-xs text-white/60">Auto-updates in Pro</div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="linksGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(236,72,153)" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="rgb(99,102,241)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeOpacity={0.1} vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.6)" }} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.6)" }} />
                <Tooltip
                  contentStyle={{
                    background: "#0A0B11",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="links"
                  stroke="rgb(236,72,153)"
                  fill="url(#linksGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Scans */}
        <div className="rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
          <div className="font-semibold mb-3">Recent Scans</div>

          <div className="space-y-2">
            {(recentScans.length ? recentScans : mockScans).map((s: any) => {
              const links = s.total_backlinks ?? s.links ?? 0;
              const refs = s.ref_domains ?? s.ref ?? 0;
              const timeLabel = s.created_at
                ? new Date(s.created_at).toLocaleString()
                : s.time;

              return (
                <div
                  key={`${s.domain}-${timeLabel}`}
                  className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm font-semibold">{s.domain}</div>
                    <div className="text-xs text-white/60">
                      {links} links · {refs} refs
                    </div>
                  </div>

                  <div className="text-right">
                    {typeof s.change === "number" && (
                      <div
                        className={clsx(
                          "text-sm font-semibold flex items-center gap-1 justify-end",
                          s.change >= 0 ? "text-emerald-300" : "text-red-300"
                        )}
                      >
                        {s.change >= 0 ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4" />
                        )}
                        {Math.abs(s.change)}
                      </div>
                    )}

                    <div className="text-xs text-white/50">{timeLabel}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <button className="mt-3 w-full text-sm px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10">
            View All Scans
          </button>
        </div>

        {/* Table */}
        <div className="xl:col-span-3 rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Backlink Explorer (Top Domains)</div>
            <div className="text-xs text-white/60">Deep crawl + AI toxicity in Pro</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-white/60">
                <tr className="border-b border-white/10">
                  <th className="text-left py-2">Referring Domain</th>
                  <th className="text-left py-2">Links</th>
                  <th className="text-left py-2">Type</th>
                  <th className="text-left py-2">Anchor profile</th>
                  <th className="text-left py-2">Toxicity</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {result?.linksDetailed &&
                  Object.values(
                    result.linksDetailed.reduce<Record<string, LinkDetail[]>>(
                      (acc, link) => {
                        const dom = link.target_domain || safeHost(link.target_url);
                        if (!dom) return acc;
                        if (!acc[dom]) acc[dom] = [];
                        acc[dom].push(link);
                        return acc;
                      },
                      {}
                    )
                  )
                    .slice(0, 12)
                    .map((group, i) => {
                      const first = group[0];
                      const host = first.target_domain || safeHost(first.target_url);
                      const linkCount = group.length;

                      const ai = domainAi.get(host.toLowerCase());
                      const toxicity = ai?.toxicity;
                      const spamRisk = ai?.spam_risk ?? 0;
                      const anchorCat = ai?.anchor_category ?? "mixed";

                      const typeLabel = LINK_TYPE_LABELS[first.link_type] || "Other";

                      let toxClass =
                        "bg-emerald-500/15 text-emerald-200 border-emerald-400/20";
                      let toxLabel = "Low";

                      if (toxicity === "medium" || spamRisk >= 40) {
                        toxClass =
                          "bg-amber-500/15 text-amber-200 border-amber-400/20";
                        toxLabel = "Medium";
                      }
                      if (toxicity === "high" || spamRisk >= 70) {
                        toxClass = "bg-red-500/20 text-red-100 border-red-500/40";
                        toxLabel = "High";
                      }

                      return (
                        <tr key={host + i} className="border-b border-white/5">
                          <td className="py-2 font-medium">{host}</td>
                          <td className="py-2">{linkCount}</td>
                          <td className="py-2 text-white/70">{typeLabel}</td>
                          <td className="py-2 text-white/70 capitalize">
                            {anchorCat === "mixed"
                              ? "Mixed anchors"
                              : `${anchorCat} anchors`}
                          </td>
                          <td className="py-2">
                            {ai ? (
                              <span
                                className={clsx(
                                  "px-2 py-1 rounded-lg text-xs border inline-flex items-center gap-1",
                                  toxClass
                                )}
                              >
                                <ShieldAlert className="h-3 w-3" />
                                {toxLabel} · {spamRisk.toFixed(0)}%
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded-lg text-xs bg-white/5 text-white/70 border border-white/20">
                                Estimating…
                              </span>
                            )}
                          </td>
                          <td className="py-2">
                            <span className="px-2 py-1 rounded-lg text-xs bg-emerald-500/15 text-emerald-200 border border-emerald-400/20">
                              Active
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                {!result && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-white/50">
                      Run a Quick Scan to populate results.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}

/* ---------- small UI components ---------- */

function KPI({
  icon,
  label,
  value,
  delta,
  negative,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  delta: string;
  negative?: boolean;
}) {
  return (
    <div className="rounded-2xl p-4 bg-black/40 border border-white/10 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div className="p-2 rounded-xl bg-white/5 border border-white/10">
          {icon}
        </div>
        <div
          className={clsx(
            "text-xs font-semibold px-2 py-1 rounded-lg border",
            negative
              ? "text-red-200 bg-red-500/10 border-red-400/20"
              : "text-emerald-200 bg-emerald-500/10 border-emerald-400/20"
          )}
        >
          {delta}
        </div>
      </div>
      <div className="mt-3 text-2xl font-bold">{value}</div>
      <div className="text-xs text-white/60">{label}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl p-3 bg-white/5 border border-white/10">
      <div className="text-xs text-white/60">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

function HealthRow({
  label,
  score,
  color,
  invert,
}: {
  label: string;
  score: number;
  color: "pink" | "cyan" | "red";
  invert?: boolean;
}) {
  const barColor =
    color === "pink"
      ? "from-pink-500 to-fuchsia-500"
      : color === "cyan"
      ? "from-cyan-400 to-indigo-500"
      : "from-red-500 to-orange-500";

  const pct = invert ? 100 - score : score;

  return (
    <div>
      <div className="flex justify-between text-xs text-white/70 mb-1">
        <span>{label}</span>
        <span className={invert ? "text-red-200" : "text-white"}>{score}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className={clsx("h-full bg-gradient-to-r", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function safeHost(link: string) {
  try {
    return new URL(link).hostname;
  } catch {
    return link;
  }
}

function SparkleDot() {
  return (
    <div className="relative">
      <span className="block w-2 h-2 rounded-full bg-pink-400" />
      <span className="absolute inset-0 rounded-full bg-pink-400/40 blur-[2px]" />
    </div>
  );
}
