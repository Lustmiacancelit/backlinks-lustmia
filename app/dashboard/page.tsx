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
} from "lucide-react";
import clsx from "clsx";
import { supabaseBrowserClient } from "@/lib/supabase/browser"; // Supabase

type BacklinkResult = {
  target: string;
  totalBacklinks: number;
  refDomains: number;
  sample: string[];
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
  { domain: "competitor.io", links: 201, ref: 64, change: +12, time: "2 days ago" },
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

  const remaining = quota?.remaining ?? 0;
  const planName = quota?.plan ?? "free";
  const isProUser = !!quota?.isPro;
  const canUseProScan = isProUser && remaining > 0;

  useEffect(() => {
    supabaseBrowserClient.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) return;

      const user = data.user;
      const meta: any = user.user_metadata || {};
      const email = user.email || "";

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

  async function consumeProScanIfNeeded(scanMode: Mode) {
    if (scanMode !== "pro") return true;

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
          setError(
            "Protected site detected. Try Pro Scan or a different site."
          );
          return;
        }
        throw new Error(data?.error || "Scan failed.");
      }

      setResult(data);
      setMode(effectiveMode);

      if (effectiveMode === "pro") {
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
    const links = result?.totalBacklinks ?? 0;
    const ref = result?.refDomains ?? 0;
    const toxic = Math.max(0, Math.round(links * 0.06));
    const growth = links === 0 ? 0 : Math.round((links / Math.max(1, ref)) * 8);
    return { links, ref, toxic, growth };
  }, [result]);

  return (
    <DashboardLayout active="overview">
      {/* TOPBAR */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          {displayName && (
            <p className="text-sm text-white/70 mb-0.5">
              Hi {displayName} 👋
            </p>
          )}
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Backlinks Dashboard
          </h1>
          <p className="text-white/60 text-sm">
            Track backlinks, referring domains, toxicity & growth — Lustmia style.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-white/10">
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
                {isProUser ? (
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
              disabled={loading || !canUseProScan}
              className={clsx(
                "flex items-center gap-2 px-5 py-3 rounded-xl font-semibold",
                !canUseProScan
                  ? "bg-white/5 border border-white/10 text-white/40 cursor-not-allowed"
                  : "bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500 hover:opacity-90"
              )}
            >
              <Zap className="h-4 w-4" />
              {!canUseProScan
                ? "Upgrade to use Pro Scan"
                : loading && mode === "pro"
                ? "Pro Scanning..."
                : "Pro Scan"}
            </button>
          </form>

          {error && (
            <div className="mt-3 text-sm text-red-200 bg-red-900/30 border border-red-700/40 p-3 rounded-xl">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <MiniStat label="Backlinks" value={kpis.links} />
              <MiniStat label="Ref. Domains" value={kpis.ref} />
              <MiniStat label="Toxic (est.)" value={kpis.toxic} />

              <div className="md:col-span-3 mt-2">
                <div className="text-xs text-white/60 mb-1">Sample backlinks</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {result.sample.map((s, i) => (
                    <a
                      key={i}
                      href={s}
                      target="_blank"
                      className="group text-sm bg-white/5 border border-white/10 rounded-xl p-2 break-all hover:bg-white/10"
                    >
                      {s}
                      <ExternalLink className="inline ml-2 h-3 w-3 opacity-60 group-hover:opacity-100" />
                    </a>
                  ))}
                </div>
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

          <div className="space-y-3">
            <HealthRow label="Authority Trend" score={76} color="pink" />
            <HealthRow label="Backlink Velocity" score={68} color="cyan" />
            <HealthRow label="Spam Risk" score={14} color="red" invert />
          </div>

          <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white/70">
            AI tips unlocked in Pro: toxic detection, outreach suggestions,
            competitor gaps.
          </div>
        </div>
      </section>

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
              <AreaChart data={mockTrend}>
                <defs>
                  <linearGradient
                    id="linksGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="rgb(236,72,153)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="100%"
                      stopColor="rgb(99,102,241)"
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeOpacity={0.1} vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fill: "rgba(255,255,255,0.6)" }}
                />
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
                          s.change >= 0
                            ? "text-emerald-300"
                            : "text-red-300"
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

                    <div className="text-xs text-white/50">
                      {timeLabel}
                    </div>
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
            <div className="font-semibold">
              Backlink Explorer (Top Domains)
            </div>
            <div className="text-xs text-white/60">Deep crawl in Pro</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-white/60">
                <tr className="border-b border-white/10">
                  <th className="text-left py-2">Referring Domain</th>
                  <th className="text-left py-2">Links</th>
                  <th className="text-left py-2">Type</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {(result?.sample ?? []).slice(0, 6).map((link, i) => {
                  const host = safeHost(link);
                  return (
                    <tr key={i} className="border-b border-white/5">
                      <td className="py-2 font-medium">{host}</td>
                      <td className="py-2">{1 + (i % 4)}</td>
                      <td className="py-2 text-white/70">
                        {i % 2 === 0 ? "Editorial" : "Directory"}
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
                    <td
                      colSpan={4}
                      className="py-8 text-center text-white/50"
                    >
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
        <span className={invert ? "text-red-200" : "text-white"}>
          {score}%
        </span>
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
