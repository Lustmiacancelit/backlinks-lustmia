"use client";

import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

type Strategy = "desktop" | "mobile";

function clampScore(score01?: number) {
  if (typeof score01 !== "number") return null;
  return Math.round(score01 * 100);
}

function ScorePie({ value }: { value: number | null }) {
  const data = useMemo(() => {
    const v = value ?? 0;
    return [
      { name: "score", value: v },
      { name: "rest", value: 100 - v },
    ];
  }, [value]);

  // no fixed colors requested? keep it simple: gray remainder, accent for score
  return (
    <div style={{ width: 110, height: 110 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={36}
            outerRadius={50}
            startAngle={90}
            endAngle={-270}
            stroke="none"
          >
            <Cell />
            <Cell fill="#2b2b2b" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div style={{ marginTop: -78, textAlign: "center", fontSize: 22, fontWeight: 700 }}>
        {value ?? "—"}
      </div>
    </div>
  );
}

function pickAuditNumeric(audits: any, id: string) {
  const a = audits?.[id];
  if (!a) return null;
  // many audits have numericValue in ms; displayValue already formatted
  return a.displayValue ?? null;
}

export default function MetricsPage() {
  const [url, setUrl] = useState("https://lustmia.com/");
  const [loading, setLoading] = useState(false);
  const [strategy, setStrategy] = useState<Strategy>("desktop");
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(s: Strategy) {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(`/api/pagespeed?url=${encodeURIComponent(url)}&strategy=${s}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to fetch PageSpeed");
      setData(json);
    } catch (e: any) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  const categories = data?.lighthouseResult?.categories;
  const audits = data?.lighthouseResult?.audits;

  const scores = {
    performance: clampScore(categories?.performance?.score),
    accessibility: clampScore(categories?.accessibility?.score),
    bestPractices: clampScore(categories?.["best-practices"]?.score),
    seo: clampScore(categories?.seo?.score),
  };

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>Site Metrics</h1>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          style={{ width: 420, padding: 10, borderRadius: 10, border: "1px solid #333" }}
        />

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => {
              setStrategy("desktop");
              run("desktop");
            }}
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #333" }}
          >
            Desktop
          </button>
          <button
            onClick={() => {
              setStrategy("mobile");
              run("mobile");
            }}
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #333" }}
          >
            Mobile
          </button>
        </div>

        <button
          onClick={() => run(strategy)}
          disabled={loading}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #333",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Running..." : "Analyze"}
        </button>
      </div>

      {error && (
        <div style={{ padding: 12, borderRadius: 10, border: "1px solid #633", marginBottom: 16 }}>
          {error}
        </div>
      )}

      {data && (
        <>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 18 }}>
            <div style={{ padding: 14, borderRadius: 14, border: "1px solid #333" }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Performance</div>
              <ScorePie value={scores.performance} />
            </div>
            <div style={{ padding: 14, borderRadius: 14, border: "1px solid #333" }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Accessibility</div>
              <ScorePie value={scores.accessibility} />
            </div>
            <div style={{ padding: 14, borderRadius: 14, border: "1px solid #333" }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Best Practices</div>
              <ScorePie value={scores.bestPractices} />
            </div>
            <div style={{ padding: 14, borderRadius: 14, border: "1px solid #333" }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>SEO</div>
              <ScorePie value={scores.seo} />
            </div>
          </div>

          <div style={{ padding: 16, borderRadius: 14, border: "1px solid #333" }}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Core metrics</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
              <div>LCP: {pickAuditNumeric(audits, "largest-contentful-paint") ?? "—"}</div>
              <div>CLS: {pickAuditNumeric(audits, "cumulative-layout-shift") ?? "—"}</div>
              <div>TBT: {pickAuditNumeric(audits, "total-blocking-time") ?? "—"}</div>
              <div>INP: {pickAuditNumeric(audits, "interaction-to-next-paint") ?? "—"}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
