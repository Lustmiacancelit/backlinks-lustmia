import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ADMIN_EMAIL = "sales@lustmia.com";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

const PLAN_LIMITS: Record<string, number> = {
  free: Number(process.env.PROSCAN_LIMIT_FREE ?? 0),
  personal: Number(process.env.PROSCAN_LIMIT_PERSONAL ?? 3),
  business: Number(process.env.PROSCAN_LIMIT_BUSINESS ?? 15),
  agency: Number(process.env.PROSCAN_LIMIT_AGENCY ?? 40),
};

function computePlanLimit(planRaw: string | null | undefined, status: string) {
  const plan = (planRaw || "free").toLowerCase();
  const isActive = status === "active";
  if (!isActive || plan === "free") return PLAN_LIMITS.free;
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

function nextUtcMidnightISO() {
  const now = new Date();
  const resetAt = new Date(now);
  resetAt.setUTCHours(24, 0, 0, 0);
  return resetAt.toISOString();
}

async function reserveDailyToken(params: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>;
  userId: string;
  limit: number;
}) {
  const { supabaseAdmin, userId, limit } = params;

  const now = new Date();
  const resetAtISO = nextUtcMidnightISO();

  let usedToday = 0;

  const { data: usage } = await supabaseAdmin
    .from("proscan_usage")
    .select("used_today, reset_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (usage) {
    const resetAtDb = usage.reset_at ? new Date(usage.reset_at) : null;
    if (resetAtDb && resetAtDb > now) usedToday = usage.used_today || 0;
    else usedToday = 0;
  }

  await supabaseAdmin.from("proscan_usage").upsert({
    user_id: userId,
    used_today: usedToday,
    limit,
    reset_at: resetAtISO,
  });

  const remaining = Math.max(limit - usedToday, 0);
  if (remaining <= 0) {
    return {
      ok: false as const,
      limit,
      usedToday,
      remaining: 0,
      resetAt: resetAtISO,
    };
  }

  await supabaseAdmin.from("proscan_usage").upsert({
    user_id: userId,
    used_today: usedToday + 1,
    limit,
    reset_at: resetAtISO,
  });

  return {
    ok: true as const,
    limit,
    usedTodayBefore: usedToday,
    usedTodayAfter: usedToday + 1,
    remainingAfter: Math.max(limit - (usedToday + 1), 0),
    resetAt: resetAtISO,
  };
}

async function rollbackDailyToken(params: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>;
  userId: string;
  usedTodayBefore: number;
  limit: number;
  resetAtISO: string;
}) {
  const { supabaseAdmin, userId, usedTodayBefore, limit, resetAtISO } = params;

  try {
    await supabaseAdmin.from("proscan_usage").upsert({
      user_id: userId,
      used_today: Math.max(usedTodayBefore, 0),
      limit,
      reset_at: resetAtISO,
    });
  } catch {
    // ignore rollback failure
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const url = body?.url;
    const strategy = body?.strategy;
    const psi = body?.psi;

    if (!psi) {
      return NextResponse.json({ error: "Missing psi payload" }, { status: 400 });
    }

    // Cookie auth is the ONLY source of truth
    const supabaseAuth = createSupabaseServer();
    const { data: authData } = await supabaseAuth.auth.getUser();
    const authedUser = authData?.user ?? null;

    if (!authedUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const authedEmail = (authedUser.email ?? "").toLowerCase();
    const isAdmin = authedEmail === ADMIN_EMAIL;
    const userId = authedUser.id;

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // ---------------------------------------
    // ADMIN BYPASS: skip subscription + quota
    // ---------------------------------------
    let reservation:
      | (ReturnType<typeof reserveDailyToken> extends Promise<infer R> ? R : never)
      | null = null;

    if (!isAdmin) {
      // 1) Verify subscription is active + paid
      let plan = "free";
      let status = "inactive";

      try {
        const { data: sub } = await supabaseAdmin
          .from("proscan_subscriptions")
          .select("plan,status")
          .eq("user_id", userId)
          .maybeSingle();

        if (sub) {
          plan = (sub.plan || plan).toLowerCase();
          status = sub.status || status;
        }
      } catch {
        plan = "free";
        status = "inactive";
      }

      const isPaidActive = status === "active" && plan !== "free";
      if (!isPaidActive) {
        return NextResponse.json(
          { error: "Upgrade required to unlock AI recommendations." },
          { status: 402 }
        );
      }

      // 2) Reserve quota BEFORE OpenAI
      const limit = computePlanLimit(plan, status);
      if (!Number.isFinite(limit) || limit <= 0) {
        return NextResponse.json(
          { error: "AI quota is not available for your plan. Please contact support." },
          { status: 403 }
        );
      }

      try {
        reservation = await reserveDailyToken({ supabaseAdmin, userId, limit });
      } catch {
        return NextResponse.json(
          { error: "Usage tracking unavailable. Please contact support." },
          { status: 503 }
        );
      }

      if (!reservation.ok) {
        return NextResponse.json(
          {
            error: "Daily limit reached. Please try again tomorrow or upgrade.",
            limit: reservation.limit,
            remaining: 0,
            resetAt: reservation.resetAt,
          },
          { status: 429 }
        );
      }
    }

    // ---------------------------------------
    // 3) Run OpenAI
    // ---------------------------------------
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
      // rollback ONLY if we reserved (non-admin)
      if (reservation && reservation.ok) {
        await rollbackDailyToken({
          supabaseAdmin,
          userId,
          usedTodayBefore: reservation.usedTodayBefore,
          limit: reservation.limit,
          resetAtISO: reservation.resetAt,
        });
      }

      return NextResponse.json(
        { error: data?.error?.message || "AI request failed" },
        { status: 400 }
      );
    }

    const text =
      data?.output?.[0]?.content?.[0]?.text ?? data?.output_text ?? null;

    if (!text) {
      if (reservation && reservation.ok) {
        await rollbackDailyToken({
          supabaseAdmin,
          userId,
          usedTodayBefore: reservation.usedTodayBefore,
          limit: reservation.limit,
          resetAtISO: reservation.resetAt,
        });
      }
      return NextResponse.json({ error: "No AI output" }, { status: 500 });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      if (reservation && reservation.ok) {
        await rollbackDailyToken({
          supabaseAdmin,
          userId,
          usedTodayBefore: reservation.usedTodayBefore,
          limit: reservation.limit,
          resetAtISO: reservation.resetAt,
        });
      }

      return NextResponse.json(
        { error: "AI did not return valid JSON", raw: text },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "metrics-ai failed" },
      { status: 500 }
    );
  }
}
