import { NextRequest, NextResponse } from "next/server";

const MOZ_API_URL = "https://api.moz.com/jsonrpc";
const MOZ_TOKEN = process.env.MOZ_API_TOKEN!;

// ---- Generic Moz JSON-RPC client ----
async function mozJsonRpc<T>(method: string, data: any): Promise<T> {
  if (!MOZ_TOKEN) {
    throw new Error("Missing MOZ_API_TOKEN in env");
  }

  const body = {
    jsonrpc: "2.0" as const,
    // Make sure ID >= 24 chars
    id: `rankcore-keyword-${Date.now()}`, // 30+ characters
    method,
    params: { data },
  };

  const res = await fetch(MOZ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-moz-token": MOZ_TOKEN,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Moz HTTP ${res.status}: ${text}`);
  }

  const json = await res.json();
  if (json.error) {
    throw new Error(`Moz API error: ${json.error.message}`);
  }

  return json.result as T;
}

// ---- Moz helpers ----

// From Moz docs: JSON-RPC method `data.keyword.metrics.fetch`
async function fetchKeywordMetrics(keyword: string, locale = "en-US") {
  return mozJsonRpc<{
    keyword_metrics: {
      volume: number | null;
      difficulty: number | null;
      organic_ctr: number | null;
      priority: number | null;
    } | null;
  }>("data.keyword.metrics.fetch", {
    serp_query: {
      keyword,
      locale,
      engine: "google",
      device: "desktop",
    },
  });
}

// From Moz docs: JSON-RPC method `data.keyword.suggestions.list`
async function listKeywordSuggestions(keyword: string, locale = "en-US", limit = 25) {
  return mozJsonRpc<{
    suggestions: { keyword: string; relevance: number }[];
  }>("data.keyword.suggestions.list", {
    serp_query: {
      keyword,
      locale,
      engine: "google",
      device: "desktop",
    },
    page: { n: 0, limit },
    options: { strategy: "default" },
  });
}

// ---- API handler ----
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const locale = searchParams.get("locale") || "en-US";

    if (!q) {
      return NextResponse.json({ error: "Missing q (keyword)" }, { status: 400 });
    }

    // 1) Suggestions from Moz
    const suggestionsResult = await listKeywordSuggestions(q, locale);
    const suggestions = suggestionsResult.suggestions || [];

    const keywords: string[] = [
      q,
      ...suggestions.map((s) => s.keyword),
    ].slice(0, 50);

    // 2) Metrics for each keyword
    const metricsResults = await Promise.all(
      keywords.map(async (kw) => {
        const r = await fetchKeywordMetrics(kw, locale);
        return {
          keyword: kw,
          metrics: r.keyword_metrics,
        };
      })
    );

    // 3) Build summary for the top panel
    const summary = buildSummary(metricsResults);

    return NextResponse.json({
      seed: q,
      locale,
      summary,
      keywords: metricsResults,
    });
  } catch (e: any) {
    console.error("Keyword Explorer API error:", e);
    return NextResponse.json(
      { error: "Keyword Explorer failed", details: e.message },
      { status: 500 }
    );
  }
}

function buildSummary(rows: { keyword: string; metrics: any }[]) {
  let totalVolume = 0;
  let totalDiff = 0;
  let totalCtr = 0;
  let totalPriority = 0;
  let count = 0;

  for (const row of rows) {
    const m = row.metrics;
    if (!m) continue;
    count++;
    totalVolume += m.volume ?? 0;
    totalDiff += m.difficulty ?? 0;
    totalCtr += m.organic_ctr ?? 0;
    totalPriority += m.priority ?? 0;
  }

  if (!count) return null;

  return {
    total_keywords: count,
    total_volume: totalVolume,
    avg_monthly_volume: totalVolume / count,
    avg_difficulty: totalDiff / count,
    avg_organic_ctr: totalCtr / count,
    avg_priority: totalPriority / count,
    last_updated: new Date().toISOString(),
  };
}
