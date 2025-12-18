import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { url, strategy, psi } = await req.json();

  if (!psi) {
    return NextResponse.json({ error: "Missing psi payload" }, { status: 400 });
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
  }

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  const prompt = `
You are an expert web performance consultant.

Given this PageSpeed Insights (Lighthouse) JSON for:
- URL: ${url || "unknown"}
- Strategy: ${strategy || "unknown"}

Rules:
- ONLY use the provided PSI data. Do NOT invent issues or values.
- Return ONLY valid JSON that matches the schema.

Tasks:
1) Explain Core Web Vitals + key lab metrics in simple language:
   - LCP, CLS, INP, TBT (and optionally FCP, Speed Index)
2) Use PSI audits to identify top issues/opportunities/diagnostics.
3) Provide a prioritized action plan with concrete fixes.
4) Output JSON with this shape:
{
  "summary": string,
  "metricsExplained": [{ "name": "LCP", "what": string, "whyItMatters": string, "howToImprove": string[] }],
  "topIssues": [{ "title": string, "impact": "high|medium|low", "why": string, "howToFix": string[] }],
  "quickWins": string[],
  "nextSteps": string[]
}

Here is the PSI JSON:
${JSON.stringify(psi).slice(0, 180000)}
`.trim();

  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: prompt,

      // Strongly encourages valid JSON output
      text: {
        format: {
          type: "json_schema",
          name: "metrics_ai",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              summary: { type: "string" },
              metricsExplained: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    name: { type: "string" },
                    what: { type: "string" },
                    whyItMatters: { type: "string" },
                    howToImprove: { type: "array", items: { type: "string" } },
                  },
                  required: ["name", "what", "whyItMatters", "howToImprove"],
                },
              },
              topIssues: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string" },
                    impact: { type: "string", enum: ["high", "medium", "low"] },
                    why: { type: "string" },
                    howToFix: { type: "array", items: { type: "string" } },
                  },
                  required: ["title", "impact", "why", "howToFix"],
                },
              },
              quickWins: { type: "array", items: { type: "string" } },
              nextSteps: { type: "array", items: { type: "string" } },
            },
            required: ["summary", "metricsExplained", "topIssues", "quickWins", "nextSteps"],
          },
        },
      },
    }),
  });

  const data = await r.json();

  if (!r.ok) {
    return NextResponse.json(
      { error: data?.error?.message || "AI request failed" },
      { status: 400 }
    );
  }

  const text =
    data?.output?.[0]?.content?.[0]?.text ??
    data?.output_text ??
    null;

  if (!text) {
    return NextResponse.json({ error: "No AI output" }, { status: 500 });
  }

  // With json_schema format, this should already be valid JSON text
  try {
    return NextResponse.json(JSON.parse(text));
  } catch {
    return NextResponse.json(
      { error: "AI did not return valid JSON", raw: text },
      { status: 500 }
    );
  }
}
