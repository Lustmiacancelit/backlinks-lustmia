"use client";

import { useState } from "react";

type Summary = {
  total_keywords: number;
  total_volume: number;
  avg_monthly_volume: number;
  avg_difficulty: number;
  avg_organic_ctr: number;
  avg_priority: number;
  last_updated: string;
};

type KeywordRow = {
  keyword: string;
  metrics: {
    volume: number | null;
    difficulty: number | null;
    organic_ctr: number | null;
    priority: number | null;
  } | null;
};

type ApiResponse = {
  seed: string;
  locale: string;
  summary: Summary | null;
  keywords: KeywordRow[];
};

export default function KeywordExplorerPage() {
  const [query, setQuery] = useState("");
  const [locale, setLocale] = useState("en-US");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runSearch() {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/keyword-explorer?q=${encodeURIComponent(query)}&locale=${locale}`
      );
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || json.error || "Request failed");
      }

      setData(json);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  const summary = data?.summary ?? null;

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-white">Keyword Explorer</h1>
        <p className="text-sm text-neutral-400">
          Discover and prioritize keywords using Moz data — all inside Rankcore.ai.
        </p>
      </header>

      {/* Search bar */}
      <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="flex-1 flex gap-3">
          <input
            className="flex-1 bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white outline-none"
            placeholder="Enter a keyword (e.g. domain authority)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <select
            className="bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
          >
            <option value="en-US">United States – en-US</option>
            <option value="en-GB">United Kingdom – en-GB</option>
          </select>
        </div>

        <button
          onClick={runSearch}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-fuchsia-500 text-white font-medium text-sm disabled:opacity-60"
        >
          {loading ? "Analyzing…" : "Analyze"}
        </button>
      </section>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/40 border border-red-800 rounded-xl p-3">
          {error}
        </div>
      )}

      {/* Top section: Latest Search + CTA (like Moz's top cards) */}
      {data && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Latest Search / Summary card */}
          <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Latest Search
                </h2>
                <p className="text-xs text-neutral-400">
                  Seed keyword:{" "}
                  <span className="font-medium text-neutral-200">
                    {data.seed}
                  </span>{" "}
                  · Locale: {data.locale}
                </p>
              </div>
              {summary && (
                <span className="px-2 py-1 rounded-full bg-fuchsia-500/10 text-fuchsia-300 text-xs font-medium">
                  {summary.total_keywords} keywords found
                </span>
              )}
            </div>

            {summary ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <SummaryStat
                  label="Total Keywords"
                  value={summary.total_keywords}
                />
                <SummaryStat
                  label="Total Volume"
                  value={formatNumber(summary.total_volume)}
                />
                <SummaryStat
                  label="Avg Monthly Volume"
                  value={formatNumber(summary.avg_monthly_volume)}
                />
                <SummaryStat
                  label="Average Difficulty"
                  value={summary.avg_difficulty.toFixed(1)}
                />
                <SummaryStat
                  label="Average Organic CTR"
                  value={`${summary.avg_organic_ctr.toFixed(1)}%`}
                />
                <SummaryStat
                  label="Average Priority"
                  value={summary.avg_priority.toFixed(1)}
                />
                <SummaryStat
                  label="Last Updated"
                  value={new Date(
                    summary.last_updated
                  ).toLocaleDateString()}
                />
              </div>
            ) : (
              <p className="text-sm text-neutral-400">
                No summary metrics available yet. Try running a search above.
              </p>
            )}
          </div>

          {/* Right-hand CTA / Info card */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-white">
                Save & manage keyword lists
              </h2>
              <p className="text-sm text-neutral-400">
                Turn your searches into reusable keyword lists, share them with
                clients, and track changes over time — all powered by Moz data.
              </p>
            </div>
            <div className="space-y-2">
              <button className="w-full py-2 rounded-xl bg-fuchsia-500 text-white text-sm font-medium">
                Upgrade to unlock keyword lists
              </button>
              <p className="text-[11px] text-neutral-500 text-center">
                Coming soon: import/export CSV and automatic syncing with client
                projects.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Middle explainer row – like “Do keyword research with Keyword Explorer” */}
      <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-base font-semibold text-white">
          Do keyword research with Keyword Explorer
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <ExplainerCard
            title="Explore by site"
            description="Uncover competitive opportunities and find seed keywords from your own site or a competitor domain."
          />
          <ExplainerCard
            title="Explore by keyword"
            description="Get related suggestions, SERP analysis, and performance metrics to understand where to focus."
          />
          <ExplainerCard
            title="Build keyword lists"
            description="Group keywords into lists per client or project, prioritize with metrics, and export for campaigns."
          />
        </div>
      </section>

      {/* Keyword table */}
      {data && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">
              Top Keywords from Latest Search
            </h2>
            <p className="text-xs text-neutral-500">
              Keyword data provided by <span className="underline">Moz</span>.
            </p>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-900/80">
                <tr>
                  <Th>Keyword</Th>
                  <Th>Volume</Th>
                  <Th>Difficulty</Th>
                  <Th>Organic CTR</Th>
                  <Th>Priority</Th>
                </tr>
              </thead>
              <tbody>
                {data.keywords.map((row) => (
                  <tr key={row.keyword} className="border-t border-neutral-800">
                    <Td>{row.keyword}</Td>
                    <Td>{row.metrics?.volume ?? "—"}</Td>
                    <Td>{row.metrics?.difficulty ?? "—"}</Td>
                    <Td>
                      {row.metrics?.organic_ctr != null
                        ? `${row.metrics.organic_ctr}%`
                        : "—"}
                    </Td>
                    <Td>{row.metrics?.priority ?? "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

/* Small helper components */

function SummaryStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] uppercase tracking-wide text-neutral-500">
        {label}
      </span>
      <span className="mt-0.5 text-sm font-medium text-neutral-100">{value}</span>
    </div>
  );
}

function ExplainerCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-2">
      <div className="w-10 h-10 rounded-xl bg-neutral-800/60 flex items-center justify-center text-xs text-neutral-200">
        {/* simple placeholder icon shape */}
        <div className="w-6 h-3 rounded-full border border-neutral-500 border-dashed" />
      </div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="text-xs text-neutral-400 leading-relaxed">{description}</p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-4 py-2 text-neutral-100 whitespace-nowrap text-sm">
      {children}
    </td>
  );
}

function formatNumber(n: number) {
  if (!Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString();
}
