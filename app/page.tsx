"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Search, Link2, Activity, ShieldAlert, TrendingUp, Globe,
  BarChart3, Settings, CreditCard, Users, Sparkles,
  ArrowUpRight, ArrowDownRight, ExternalLink, Zap,
} from "lucide-react";
import clsx from "clsx";

type BacklinkResult = {
  target: string;
  totalBacklinks: number;
  refDomains: number;
  sample: string[];
};

type Mode = "mvp" | "pro";

type Quota = {
  used: number;
  limit: number;
  resetAt: number;
};

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
  const remaining = quota ? Math.max(0, quota.limit - quota.used) : 0;

  // Load userId + quota
  useEffect(() => {
    const id = getOrCreateUserId();
    setUserId(id);

    fetch(`/api/proscan/quota?userId=${id}`)
      .then(r => r.json())
      .then(d => setQuota(d.quota))
      .catch(() => {});
  }, []);

  // ⭐ CHANGED: accept scanMode so we don't depend on async setState
  async function consumeProScanIfNeeded(scanMode: Mode) {
    if (scanMode !== "pro") return true;

    const r = await fetch("/api/proscan/quota", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action: "consume" }),
    });

    const d = await r.json().catch(() => ({}));

    if (!r.ok && d?.blocked) {
      setQuota(d.quota);
      setError(
        "Pro Scan limit reached for this month. Upgrade to get more Pro Scans."
      );
      return false;
    }

    if (d?.quota) setQuota(d.quota);
    return true;
  }

  // ⭐ CHANGED: allow forcedMode OR form-submit mode
  async function quickScan(e?: React.FormEvent, forcedMode?: Mode) {
    if (e) e.preventDefault();

    const effectiveMode: Mode = forcedMode ?? mode; // ⭐ CHANGED

    setLoading(true);
    setError(null);
    setResult(null);

    const cleanedUrl = url.trim();

    try {
      // If Pro Scan, consume quota first
      const allowed = await consumeProScanIfNeeded(effectiveMode); // ⭐ CHANGED
      if (!allowed) return;

      const res = await fetch("/api/backlinks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleanedUrl, mode: effectiveMode }), // ⭐ CHANGED
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 403 || String(data?.error || "").includes("403")) {
          setError(
            "Protected site detected. This domain blocks automated crawlers (403). " +
            "Try Pro Scan or another site."
          );
          return;
        }
        throw new Error(data?.error || "Scan failed.");
      }

      setResult(data);
      setMode(effectiveMode); // ⭐ CHANGED: keep UI aligned after scan
    } catch (err: any) {
      setError(err?.message || "Scan failed.");
    } finally {
      setLoading(false);
    }
  }

  // ⭐ CHANGED: helper that runs scan with a specific mode
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
    <div className="min-h-screen bg-[#05060A] text-white">
      {/* background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full blur-[120px] opacity-40 bg-fuchsia-600" />
        <div className="absolute top-1/3 -right-40 h-[520px] w-[520px] rounded-full blur-[140px] opacity-30 bg-cyan-500" />
        <div className="absolute bottom-[-220px] left-1/3 h-[520px] w-[520px] rounded-full blur-[160px] opacity-30 bg-purple-700" />
      </div>

      <div className="relative flex">
        {/* SIDEBAR */}
        <aside className="hidden md:flex md:w-64 lg:w-72 h-screen sticky top-0 border-r border-white/5 bg-black/30 backdrop-blur-xl">
          <div className="flex flex-col w-full p-5">
            <div className="flex items-center gap-2 mb-8">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-pink-500 via-fuchsia-500 to-indigo-500 grid place-items-center">
                <Link2 className="h-5 w-5" />
              </div>
              <div>
                <div className="font-bold text-lg leading-5">Lustmia</div>
                <div className="text-xs text-white/60">Backlinks SaaS</div>
              </div>
            </div>

            <nav className="space-y-1 text-sm">
              <SideItem icon={<BarChart3 className="h-4 w-4" />} label="Overview" active />
              <SideItem icon={<Globe className="h-4 w-4" />} label="Backlink Explorer" />
              <SideItem icon={<TrendingUp className="h-4 w-4" />} label="Competitors" />
              <SideItem icon={<ShieldAlert className="h-4 w-4" />} label="Toxic Links" />
              <SideItem icon={<Users className="h-4 w-4" />} label="Clients" />
              <SideItem icon={<CreditCard className="h-4 w-4" />} label="Billing" />
              <SideItem icon={<Settings className="h-4 w-4" />} label="Settings" />
            </nav>

            <div className="mt-auto pt-6">
              <div className="rounded-2xl p-4 bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="h-4 w-4 text-pink-400" />
                  Pro Features
                </div>
                <p className="text-xs text-white/70 mt-1">
                  Unlock deep crawl, history, alerts & white-label reports.
                </p>
                <button className="mt-3 w-full text-sm font-semibold px-3 py-2 rounded-xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500 hover:opacity-90">
                  Upgrade
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {/* TOPBAR */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
            <div>
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
                <div className="font-semibold flex items-center gap-2">
                  <Search className="h-4 w-4 text-pink-400" />
                  Quick Scan
                </div>

                <div className="text-xs text-white/60 flex items-center gap-3">
                  <span>
                    {mode === "pro"
                      ? "Pro Scan — bypass protected sites"
                      : "MVP v1 — visible outbound links"}
                  </span>

                  <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                    Pro scans left: <b>{remaining}</b>
                  </span>
                </div>
              </div>

              {/* form still works via Enter key */}
              <form onSubmit={(e) => quickScan(e)} className="flex flex-col md:flex-row gap-2">
                <input
                  type="url"
                  required
                  placeholder="https://yourdomain.com"
                  className="flex-1 px-4 py-3 rounded-xl bg-[#0A0B11] border border-white/10 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />

                {/* MVP Scan button */}
                <button
                  type="button"
                  onClick={() => runScan("mvp")} // ⭐ CHANGED
                  disabled={loading}
                  className={clsx(
                    "px-4 py-3 rounded-xl font-semibold border text-sm",
                    mode === "mvp"
                      ? "bg-white/10 border-white/20"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  )}
                >
                  {loading && mode === "mvp" ? "Scanning..." : "Scan"} {/* ⭐ CHANGED label */}
                </button>

                {/* Pro Scan button */}
                <button
                  type="button" // ⭐ CHANGED
                  onClick={() => runScan("pro")} // ⭐ CHANGED
                  disabled={loading || remaining <= 0}
                  className={clsx(
                    "flex items-center gap-2 px-5 py-3 rounded-xl font-semibold",
                    remaining <= 0
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

            {/* HEALTH / AI PANEL */}
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
                AI tips unlocked in Pro: toxic detection, outreach suggestions, competitor gaps.
              </div>
            </div>
          </section>

          {/* KPIs */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <KPI icon={<Link2 className="h-5 w-5 text-pink-300" />} label="Total Backlinks" value={kpis.links} delta="+12%" />
            <KPI icon={<Globe className="h-5 w-5 text-indigo-300" />} label="Referring Domains" value={kpis.ref} delta="+5%" />
            <KPI icon={<ShieldAlert className="h-5 w-5 text-red-300" />} label="Toxic Links" value={kpis.toxic} delta="-2%" negative />
            <KPI icon={<TrendingUp className="h-5 w-5 text-cyan-300" />} label="Growth Score" value={kpis.growth} delta="+9%" />
          </section>

          {/* CHART + TABLE */}
          <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Trend chart */}
            <div className="xl:col-span-2 rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold">Backlink Growth (7 days)</div>
                <div className="text-xs text-white/60">Auto-updates in Pro</div>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockTrend}>
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
                    <Area type="monotone" dataKey="links" stroke="rgb(236,72,153)" fill="url(#linksGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent scans */}
            <div className="rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
              <div className="font-semibold mb-3">Recent Scans</div>

              <div className="space-y-2">
                {mockScans.map((s) => (
                  <div key={s.domain} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">{s.domain}</div>
                      <div className="text-xs text-white/60">
                        {s.links} links · {s.ref} refs
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={clsx(
                          "text-sm font-semibold flex items-center gap-1 justify-end",
                          s.change >= 0 ? "text-emerald-300" : "text-red-300"
                        )}
                      >
                        {s.change >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                        {Math.abs(s.change)}
                      </div>
                      <div className="text-xs text-white/50">{s.time}</div>
                    </div>
                  </div>
                ))}
              </div>

              <button className="mt-3 w-full text-sm px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10">
                View All Scans
              </button>
            </div>

            {/* Table */}
            <div className="xl:col-span-3 rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold">Backlink Explorer (Top Domains)</div>
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
                        <td colSpan={4} className="py-8 text-center text-white/50">
                          Run a Quick Scan to populate results.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

/* ---------- small UI components ---------- */

function SideItem({
  icon,
  label,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      className={clsx(
        "w-full flex items-center gap-2 px-3 py-2 rounded-xl transition",
        active
          ? "bg-white/10 text-white border border-white/10"
          : "text-white/70 hover:bg-white/5 hover:text-white"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

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
