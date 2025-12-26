// app/api/ai/fix-coach/message/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/admin";

type MessageRole = "user" | "assistant";

type ChatMessage = {
  role: MessageRole;
  content: string;
};

type RequestBody = {
  sessionId?: string | null;
  question: string;
  metricsContext?: string | null;
};

function getCurrentPeriod() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

const DEFAULT_PLAN_ID = "free";

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.json(
      { error: "Supabase configuration error." },
      { status: 500 }
    );
  }

  const url = req.nextUrl;
  const res = NextResponse.next();

  const supabaseAuth = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      get(name) {
        return req.cookies.get(name)?.value;
      },
      set(name, value, options) {
        res.cookies.set({ name, value, ...options });
      },
      remove(name, options) {
        res.cookies.set({ name, value: "", ...options });
      },
    },
  });

  // 1) Auth: must be logged in
  const {
    data: { user },
    error: userError,
  } = await supabaseAuth.auth.getUser();

  if (userError || !user) {
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("next", "/dashboard/metrics");
    return NextResponse.redirect(loginUrl);
  }

  const body = (await req.json().catch(() => null)) as RequestBody | null;

  if (!body || !body.question?.trim()) {
    return NextResponse.json(
      { error: "Missing question." },
      { status: 400 }
    );
  }

  const question = body.question.trim();
  const sessionId = body.sessionId || null;
  const metricsContext = body.metricsContext || null;

  // 🔐 ADMIN BYPASS: sales@lustmia.com(.br) has unlimited AI and NO credits touched
  const email = user.email?.toLowerCase() || "";
  const isAdmin =
    email === "sales@lustmia.com" || email === "sales@lustmia.com.br";

  // Helper to generate the AI answer (stub – replace with real model call)
  function buildAnswer(q: string, ctx: string | null): string {
    return [
      ctx ? `Here’s the issue Rankcore.ai detected:\n${ctx}\n` : "",
      "Here’s how you can fix this on your own site:",
      "",
      "1. Find where this script/CSS is loaded (theme, plugins, or custom code).",
      "2. Defer or lazy-load anything not needed for the first screen.",
      "3. Move non-critical CSS into a separate file or load it asynchronously.",
      "4. Re-run your Rankcore.ai scan to confirm the improvement.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  // If admin, skip ALL credit reads/writes
  if (isAdmin) {
    const aiAnswer = buildAnswer(question, metricsContext);

    // You can still optionally write to ai_fix_chat_sessions here if you want
    // history for admin, but we intentionally do NOT touch user_ai_credits.
    return NextResponse.json(
      {
        ok: true,
        sessionId: sessionId ?? null,
        answer: aiAnswer,
        limit: null,       // no limit for admin
        used: null,
        remaining: null,
        planId: "admin",
      },
      { headers: res.headers }
    );
  }

  // 2) NON-ADMIN USERS → enforce credits
  const { start, end } = getCurrentPeriod();

  const { data: creditRows, error: creditError } = await supabaseAdmin
    .from("user_ai_credits")
    .select("user_id, plan_id, messages_used, period_start, period_end")
    .eq("user_id", user.id)
    .gte("period_start", start)
    .lt("period_end", end)
    .limit(1);

  let creditRow = creditRows?.[0] ?? null;

  if (!creditRow && !creditError) {
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("user_ai_credits")
      .insert({
        user_id: user.id,
        plan_id: DEFAULT_PLAN_ID,
        messages_used: 0,
        period_start: start,
        period_end: end,
      })
      .select("*")
      .single();

    if (insertErr) {
      return NextResponse.json(
        { error: "Could not initialize AI credits." },
        { status: 500 }
      );
    }

    creditRow = inserted;
  }

  const { data: plan, error: planError } = await supabaseAdmin
    .from("plans")
    .select("monthly_message_limit")
    .eq("id", creditRow.plan_id)
    .single();

  if (planError || !plan) {
    return NextResponse.json(
      { error: "Could not load plan limits." },
      { status: 500 }
    );
  }

  const limit = plan.monthly_message_limit;
  const used = creditRow.messages_used ?? 0;

  if (used >= limit) {
    return NextResponse.json(
      {
        error: "You’ve reached your AI assistant limit for this month.",
        code: "OUT_OF_CREDITS",
        remaining: 0,
        limit,
      },
      { status: 402 }
    );
  }

  // Build answer for non-admin
  const aiAnswer = buildAnswer(question, metricsContext);

  // (Optional) store conversation – left as a TODO, like before

  const { data: updatedCredits, error: updateErr } = await supabaseAdmin
    .from("user_ai_credits")
    .update({
      messages_used: used + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("period_start", creditRow.period_start)
    .select("messages_used")
    .single();

  if (updateErr) {
    console.error("Failed to increment AI credits", updateErr);
  }

  const usedAfter = updatedCredits?.messages_used ?? used + 1;

  return NextResponse.json(
    {
      ok: true,
      sessionId,
      answer: aiAnswer,
      limit,
      used: usedAfter,
      remaining: Math.max(0, limit - usedAfter),
      planId: creditRow.plan_id,
    },
    { headers: res.headers }
  );
}
