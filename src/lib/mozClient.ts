// src/lib/mozClient.ts
const MOZ_API_URL = 'https://api.moz.com/jsonrpc';
const MOZ_TOKEN = process.env.MOZ_API_TOKEN!;

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string;
  method: string;
  params: { data: any };
}

interface JsonRpcResponse<T> {
  jsonrpc: '2.0';
  id: string;
  result?: T;
  error?: { code: number; message: string; data?: any };
}

async function mozJsonRpc<T>(
  method: string,
  data: Record<string, any>,
): Promise<T> {
  if (!MOZ_TOKEN) {
    throw new Error('Missing MOZ_API_TOKEN env variable');
  }

  const body: JsonRpcRequest = {
    jsonrpc: '2.0',
    id: `moz-${Date.now()}`,
    method,
    params: { data },
  };

  const res = await fetch(MOZ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-moz-token': MOZ_TOKEN,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Moz HTTP ${res.status}: ${text}`);
  }

  const json = (await res.json()) as JsonRpcResponse<T>;
  if (json.error) {
    throw new Error(`Moz API error ${json.error.code}: ${json.error.message}`);
  }

  return json.result as T;
}

// ---- Keyword helpers ----

type Locale = 'en-US' | 'en-GB' | string;

// 1) Metrics for a single keyword
export async function fetchKeywordMetrics(keyword: string, locale: Locale = 'en-US') {
  return mozJsonRpc('data.keyword.metrics.fetch', {
    serp_query: {
      keyword,
      locale,
      engine: 'google',
      device: 'desktop',
    },
  });
}

// 2) Related keyword suggestions
export async function listKeywordSuggestions(
  keyword: string,
  locale: Locale = 'en-US',
  limit = 50,
) {
  return mozJsonRpc('data.keyword.suggestions.list', {
    serp_query: {
      keyword,
      locale,
      engine: 'google',
      device: 'desktop',
    },
    page: {
      n: 0,
      limit,
    },
    options: {
      strategy: 'default',
    },
  });
}
