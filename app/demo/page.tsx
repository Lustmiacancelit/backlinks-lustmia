"use client";

import {
  Link2,
  Activity,
  ShieldAlert,
  TrendingUp,
  Globe,
  BarChart3,
  ExternalLink,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const mockTrend = [
  { day: "Mon", links: 12 },
  { day: "Tue", links: 18 },
  { day: "Wed", links: 10 },
  { day: "Thu", links: 24 },
  { day: "Fri", links: 21 },
  { day: "Sat", links: 29 },
  { day: "Sun", links: 32 },
];

const mockSample = [
  "https://blog.example.com/seo-guide",
  "https://news.example.net/article/123",
  "https://directory.example.org/listing/456",
  "https://partner.example.io/case-study",
];

function safeHost(link: string) {
  try {
    return new URL(link).hostname;
  } catch {
    return link;
  }
}

export default function DemoDashboardPage() {
  return (
    <main className="min-h-screen bg-[#05060A] text-white relative overflow-hidden">
      {/* background glows */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full blur-[120px] opacity-40 bg-fuchsia-600" />
        <div className="absolute top-1/3 -right-40 h-[520px] w-[520px] rounded-full blur-[140px] opacity-30 bg-cyan-500" />
        <div className="absolute bottom-[-220px] left-1/3 h-[520px] w-[520px] rounded-full blur-[160px] opacity-30 bg-purple-700" />
      </div>

      <div className="relative flex">
        {/* SIMPLE SIDEBAR LABEL */}
        <aside className="hidden md:flex md:w-60 h-screen sticky top-0 border-r border-white/5 bg-black/30 backdrop-blur-xl">
          <div className="flex flex-col w-full p-5">
            <div className="flex items-center gap-2 mb-8">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-pink-500 via-fuchsia-500 to-indigo-500 grid place-items-center">
                <Link2 className="h-5 w-5" />
              </div>
              <div>
                <div className="font-bold text-lg leading-5">Lustmia</div>
                <div className="text-xs text-white/60">Sample dashboard</div>
              </div>
            </div>

            <div className="text-xs text-white/60 space-y-2">
              <p>Read-only demo.</p>
              <p>No live data, just a preview of what you&apos;ll see once you connect your domain.</p>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <section className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Sample Backlinks Dashboard
              </h1>
              <p className="text-white/60 text-sm max-w-xl">
                This is a static preview to show you how Lustmia visualizes
                your backlink health, referring domains and risk signals.
              </p>
            </div>
            <div className="text-xs text-white/50">
              Demo mode · Data is mocked for illustration
            </div>
          </header>

          {/* Top row: KPIs + chart */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* KPIs */}
            <div className="xl:col-span-1 grid grid-cols-2 gap-3">
              <KPI
                icon={<Link2 className="h-5 w-5 text-pink-300" />}
                label="Total backlinks"
                value="1,248"
                delta="+12% vs last week"
              />
              <KPI
                icon={<Globe className="h-5 w-5 text-indigo-300" />}
                label="Referring domains"
                value="186"
                delta="+7% vs last week"
              />
              <KPI
                icon={<ShieldAlert className="h-5 w-5 text-red-300" />}
                label="Toxic risk"
                value="Low"
                delta="3 suspicious domains"
              />
              <KPI
                icon={<TrendingUp className="h-5 w-5 text-cyan-300" />}
                label="Authority trend"
                value="+8.4"
                delta="Stable upward trend"
              />
            </div>

            {/* Chart */}
            <div className="xl:col-span-2 rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <BarChart3 className="h-4 w-4 text-fuchsia-300" />
                  Backlink growth (last 7 days)
                </div>
                <div className="text-xs text-white/60">
                  In the real app, this connects to your domain.
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockTrend}>
                    <defs>
                      <linearGradient id="demoLinksGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(236,72,153)" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="rgb(99,102,241)" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeOpacity={0.1} vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.6)" }} />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.6)" }} />
                    <Tooltip
                      contentStyle={{
                        background: "#05060A",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="links"
                      stroke="rgb(236,72,153)"
                      fill="url(#demoLinksGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Sample links table */}
          <div className="rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Activity className="h-4 w-4 text-cyan-300" />
                Example backlinks for a monitored domain
              </div>
              <div className="text-xs text-white/60">
                In production, this is filterable & exportable.
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-white/60">
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2">Referring page</th>
                    <th className="text-left py-2">Domain</th>
                    <th className="text-left py-2">Type</th>
                    <th className="text-left py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mockSample.map((link, i) => (
                    <tr key={link} className="border-b border-white/5">
                      <td className="py-2">
                        <a
                          href={link}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-white/90 hover:text-white"
                        >
                          <span className="truncate max-w-[260px] md:max-w-[360px]">
                            {link}
                          </span>
                          <ExternalLink className="h-3.5 w-3.5 opacity-60" />
                        </a>
                      </td>
                      <td className="py-2 text-white/70">{safeHost(link)}</td>
                      <td className="py-2 text-white/70">
                        {i % 2 === 0 ? "Editorial" : "Directory"}
                      </td>
                      <td className="py-2">
                        <span className="px-2 py-1 rounded-lg text-xs bg-emerald-500/15 text-emerald-200 border border-emerald-400/20">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={4} className="pt-3 text-xs text-white/50">
                      This table is a simplified snapshot. The real dashboard
                      adds anchors, first seen / last seen, toxicity indicators
                      and export actions.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Note at bottom */}
          <p className="text-xs text-white/50">
            This demo is static and does not use your data. To see your own
            backlink profile in a view like this, create an account, plug in
            your domain and pick a plan that matches your traffic and needs.
          </p>
        </section>
      </div>
    </main>
  );
}

function KPI({
  icon,
  label,
  value,
  delta,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta: string;
}) {
  return (
    <div className="rounded-2xl p-4 bg-black/40 border border-white/10 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div className="p-2 rounded-xl bg-white/5 border border-white/10">
          {icon}
        </div>
      </div>
      <div className="mt-3 text-2xl font-bold">{value}</div>
      <div className="text-xs text-white/60">{label}</div>
      <div className="mt-1 text-[11px] text-white/50">{delta}</div>
    </div>
  );
}
