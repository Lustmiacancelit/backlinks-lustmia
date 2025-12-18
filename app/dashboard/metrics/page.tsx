"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

type Strategy = "desktop" | "mobile";

function scoreColor(v: number | null) {
  // PageSpeed-like thresholds:
  // 0-49 red, 50-89 orange, 90-100 green
  if (v === null) return "#9aa0a6";
  if (v >= 90) return "#0CCE6B"; // green
  if (v >= 50) return "#FFA400"; // orange
  return "#FF4E42"; // red
}

function ScorePie({ value }: { value: number | null }) {
  const data = useMemo(() => {
    const v = value ?? 0;
    return [
      { name: "score", value: v },
      { name: "rest", value: 100 - v },
    ];
  }, [value]);

  const color = scoreColor(value);

  return (
    <div style={{ width: 120, height: 120, position: "relative" }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={42}
            outerRadius={55}
            startAngle={90}
            endAngle={-270}
            stroke="none"
          >
            <Cell fill={color} />
            <Cell fill="#1f1f1f" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 26,
          fontWeight: 800,
        }}
      >
        {value ?? "—"}
      </div>
    </div>
  );
}

function MetricCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 18,
        border: "1px solid #333",
        textAlign: "center",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function stripHtml(s?: string) {
  if (!s) return "";
  return s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function formatBytes(n?: number) {
  if (typeof n !== "number") return null;
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function extractPsiLists(psi: any) {
  const audits = psi?.lighthouseResult?.audits || {};
  const all = Object.entries(audits).map(([id, a]: any) => ({
    id,
    title: a?.title,
    description: stripHtml(a?.description),
    score: a?.score,
    scoreDisplayMode: a?.scoreDisplayMode,
    displayValue: a?.displayValue,
    numericValue: a?.numericValue,
    details: a?.details,
  }));

  const opportunities = all
    .filter((a) => a.details?.type === "opportunity")
    .map((a) => {
      const bytes = a.details?.overallSavingsBytes;
      const ms = a.details?.overallSavingsMs;
      const impact =
        typeof ms === "number"
          ? `${Math.round(ms)} ms`
          : typeof bytes === "number"
          ? `${formatBytes(bytes)}`
          : null;

      return {
        ...a,
        impact,
      };
    })
    .sort(
      (a, b) =>
        (b.details?.overallSavingsMs || 0) - (a.details?.overallSavingsMs || 0)
    )
    .slice(0, 10);

  const diagnostics = all
    .filter(
      (a) =>
        a.scoreDisplayMode === "informative" ||
        a.scoreDisplayMode === "manual" ||
        a.scoreDisplayMode === "notApplicable"
    )
    .filter((a) => !!a.title)
    .slice(0, 12);

  const failed = all
    .filter(
      (a) => a.scoreDisplayMode === "numeric" && typeof a.score === "number" && a.score < 0.9
    )
    .sort((a, b) => (a.score ?? 1) - (b.score ?? 1))
    .slice(0, 12);

  return { opportunities, diagnostics, failed };
}

export default function MetricsPage() {
  const [url, setUrl] = useState("https://lustmia.com/");
  const [strategy, setStrategy] = useState<Strategy>("desktop");

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const [psiRaw, setPsiRaw] = useState<any>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [ai, setAi] = useState<any>(null);

  const [error, setError] = useState<string | null>(null);

  async function run(s: Strategy) {
    setLoading(true);
    setError(null);
    setData(null);
    setPsiRaw(null);
    setAi(null);

    try {
      const [resCompact, resRaw] = await Promise.all([
        fetch(`/api/pagespeed?url=${encodeURIComponent(url)}&strategy=${s}`),
        fetch(`/api/pagespeed/raw?url=${encodeURIComponent(url)}&strategy=${s}`),
      ]);

      const compactJson = await resCompact.json();
      const rawJson = await resRaw.json();

      if (!resCompact.ok)
        throw new Error(compactJson?.error || "Failed to analyze");
      if (!resRaw.ok)
        throw new Error(rawJson?.error || "Failed to fetch raw PSI");

      setData(compactJson);
      setPsiRaw(rawJson);
    } catch (e: any) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  async function generateAi() {
    if (!psiRaw) return;
    setAiLoading(true);
    setAi(null);
    try {
      const r = await fetch("/api/metrics-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, strategy, psi: psiRaw }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "AI request failed");
      setAi(j);
    } catch (e: any) {
      setError(e.message || "AI Error");
    } finally {
      setAiLoading(false);
    }
  }

  const scores = data?.scores;
  const lists = useMemo(() => (psiRaw ? extractPsiLists(psiRaw) : null), [psiRaw]);

  return (
    <div style={{ padding: 28 }}>
      {/* TOP ROW: Back button + title */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <Link
          href="/dashboard"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.04)",
            color: "rgba(255,255,255,0.9)",
            textDecoration: "none",
            lineHeight: 1,
          }}
        >
          <span style={{ fontSize: 16 }}>←</span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Back to Dashboard</span>
        </Link>

        <h1 style={{ fontSize: 30, fontWeight: 900, margin: 0 }}>Site Metrics</h1>
      </div>

      {/* URL + Controls */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          style={{
            width: 420,
            padding: 12,
            borderRadius: 12,
            border: "1px solid #333",
            background: "#0f0f0f",
            color: "white",
          }}
        />

        <button
          onClick={() => {
            setStrategy("desktop");
            run("desktop");
          }}
          style={{ padding: "12px 14px", borderRadius: 12 }}
        >
          Desktop
        </button>

        <button
          onClick={() => {
            setStrategy("mobile");
            run("mobile");
          }}
          style={{ padding: "12px 14px", borderRadius: 12 }}
        >
          Mobile
        </button>

        <button
          onClick={() => run(strategy)}
          disabled={loading}
          style={{
            padding: "12px 18px",
            borderRadius: 12,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Analyzing…" : "Analyze"}
        </button>

        {psiRaw && (
          <button
            onClick={generateAi}
            disabled={aiLoading}
            style={{
              padding: "12px 18px",
              borderRadius: 12,
              opacity: aiLoading ? 0.6 : 1,
            }}
          >
            {aiLoading ? "Generating AI…" : "AI Recommendations"}
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: 14, borderRadius: 12, border: "1px solid #733", marginBottom: 20 }}>
          {error}
        </div>
      )}

      {scores && (
        <>
          {/* SCORE PIES */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 20,
              marginBottom: 24,
            }}
          >
            <MetricCard title="Performance">
              <ScorePie value={scores.performance} />
            </MetricCard>

            <MetricCard title="Accessibility">
              <ScorePie value={scores.accessibility} />
            </MetricCard>

            <MetricCard title="Best Practices">
              <ScorePie value={scores.bestPractices} />
            </MetricCard>

            <MetricCard title="SEO">
              <ScorePie value={scores.seo} />
            </MetricCard>
          </div>

          {/* CORE WEB VITALS */}
          <div style={{ padding: 20, borderRadius: 16, border: "1px solid #333", marginBottom: 18 }}>
            <div style={{ fontWeight: 900, marginBottom: 12 }}>Core Web Vitals</div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <div>FCP: {data.metrics?.fcp ?? "—"}</div>
              <div>LCP: {data.metrics?.lcp ?? "—"}</div>
              <div>CLS: {data.metrics?.cls ?? "—"}</div>
              <div>TBT: {data.metrics?.tbt ?? "—"}</div>
              <div>Speed Index: {data.metrics?.si ?? "—"}</div>
            </div>
          </div>

          {/* AI EXPLANATION */}
          {ai && (
            <div style={{ padding: 20, borderRadius: 16, border: "1px solid #333", marginBottom: 18 }}>
              <div style={{ fontWeight: 900, marginBottom: 10 }}>AI Summary</div>
              <div style={{ color: "rgba(255,255,255,0.85)", lineHeight: 1.5, marginBottom: 14 }}>
                {ai.summary}
              </div>

              {Array.isArray(ai.metricsExplained) && ai.metricsExplained.length > 0 && (
                <>
                  <div style={{ fontWeight: 900, marginBottom: 10 }}>What these metrics mean</div>
                  <div style={{ display: "grid", gap: 12 }}>
                    {ai.metricsExplained.map((m: any, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          padding: 14,
                          borderRadius: 14,
                          border: "1px solid #2a2a2a",
                          background: "rgba(255,255,255,0.02)",
                        }}
                      >
                        <div style={{ fontWeight: 900, marginBottom: 6 }}>{m.name}</div>
                        <div style={{ opacity: 0.9, marginBottom: 6 }}>
                          <b>What:</b> {m.what}
                        </div>
                        <div style={{ opacity: 0.9, marginBottom: 8 }}>
                          <b>Why it matters:</b> {m.whyItMatters}
                        </div>
                        {Array.isArray(m.howToImprove) && m.howToImprove.length > 0 && (
                          <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.9 }}>
                            {m.howToImprove.map((x: string, i: number) => (
                              <li key={i}>{x}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {Array.isArray(ai.quickWins) && ai.quickWins.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>Quick wins</div>
                  <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.9 }}>
                    {ai.quickWins.map((x: string, i: number) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
              )}

              {Array.isArray(ai.nextSteps) && ai.nextSteps.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>Next steps</div>
                  <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.9 }}>
                    {ai.nextSteps.map((x: string, i: number) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* ISSUES / OPPORTUNITIES */}
          {lists && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 18 }}>
              <div style={{ padding: 20, borderRadius: 16, border: "1px solid #333" }}>
                <div style={{ fontWeight: 900, marginBottom: 10 }}>
                  Top opportunities (like PageSpeed)
                </div>
                {lists.opportunities.length === 0 ? (
                  <div style={{ opacity: 0.8 }}>No opportunities found.</div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {lists.opportunities.map((o: any) => (
                      <div
                        key={o.id}
                        style={{
                          padding: 14,
                          borderRadius: 14,
                          border: "1px solid #2a2a2a",
                          background: "rgba(255,255,255,0.02)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                          <div style={{ fontWeight: 900 }}>{o.title}</div>
                          <div style={{ opacity: 0.85, whiteSpace: "nowrap" }}>
                            {o.impact || o.displayValue || ""}
                          </div>
                        </div>
                        {o.description && (
                          <div style={{ opacity: 0.85, marginTop: 6, lineHeight: 1.45 }}>
                            {o.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ padding: 20, borderRadius: 16, border: "1px solid #333" }}>
                <div style={{ fontWeight: 900, marginBottom: 10 }}>Failed audits</div>
                {lists.failed.length === 0 ? (
                  <div style={{ opacity: 0.8 }}>No failed audits found.</div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {lists.failed.map((a: any) => (
                      <div
                        key={a.id}
                        style={{
                          padding: 14,
                          borderRadius: 14,
                          border: "1px solid #2a2a2a",
                          background: "rgba(255,255,255,0.02)",
                        }}
                      >
                        <div style={{ fontWeight: 900 }}>{a.title}</div>
                        {a.displayValue && (
                          <div style={{ opacity: 0.85, marginTop: 6 }}>{a.displayValue}</div>
                        )}
                        {a.description && (
                          <div style={{ opacity: 0.85, marginTop: 6, lineHeight: 1.45 }}>
                            {a.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
