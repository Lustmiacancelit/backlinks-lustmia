// lib/backlinks/ai.ts
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export type AiBacklinkInsight = {
  summary: string;
  toxicityNotes: string;
  outreachIdeas: string[];
  competitorGaps: string[];
};

export async function runAiInsights(params: {
  target: string;
  totalBacklinks: number;
  refDomains: number;
  sample: string[];
}): Promise<AiBacklinkInsight> {
  const { target, totalBacklinks, refDomains, sample } = params;

  const sampleForPrompt = sample.slice(0, 20).join("\n");

  const completion = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content:
          "You are an SEO off-page expert. You analyze backlinks, toxicity, and outreach opportunities. Return concise bullet points.",
      },
      {
        role: "user",
        content: `
Target site: ${target}
Total backlinks: ${totalBacklinks}
Referring domains: ${refDomains}

Sample backlinks:
${sampleForPrompt}

1) Give a 2–3 sentence summary of the backlink profile.
2) Give 3 bullet points about potential toxicity or spam risk.
3) Suggest 3–5 outreach / growth ideas.
4) Suggest 3 domains or site types where the user likely has gaps vs competitors.

Respond as JSON only with keys: summary, toxicityNotes, outreachIdeas, competitorGaps.
        `,
      },
    ],
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0].message.content || "{}";
  const parsed = JSON.parse(raw);

  return {
    summary: parsed.summary ?? "",
    toxicityNotes: parsed.toxicityNotes ?? "",
    outreachIdeas: parsed.outreachIdeas ?? [],
    competitorGaps: parsed.competitorGaps ?? [],
  };
}
