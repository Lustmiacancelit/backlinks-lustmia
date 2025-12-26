// app/api/ai/fix-coach/message/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/admin";
// import your AI client here if you have one, e.g. OpenAI
// import { openai } from "@/lib/openai";

const ADMIN_EMAILS = ["sales@lustmia.com", "sales@lustmia.com.br"] as const;

const PLAN_LIMITS: Record<string, number> = {
  free: 20,
  pro: 200,
  admin: 999999,
};

type MessageCreditsRow = {
  user_id: string;
  plan: string;
  used_messages: number;
  reset_at: string | null;
};

function getLimitForPlan(plan: string) {
  if (plan === "admin") return PLAN_LIMITS.admin;
  if (plan === "pro") return PLAN_LIMITS.pro;
  return PLAN_LIMITS.free;
}

export async function POST(req: NextRequest) {
  try {
    const { question, siteContext, sessionId } = await req.json().catch(() => ({}));

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing question" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnon =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnon) {
      return NextResponse.json(
        { ok: false, error: "Supabase env vars not configured" },
        { status: 500 }
      );
    }

    // IMPORTANT: in a route handler we create our own response object,
    // NOT `NextResponse.next()`.
    const cookieResponse = new NextResponse();

    const supabase = createServerClient(supabaseUrl, supabaseAnon, {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value;
        },
        set(name, value, options) {
          cookieResponse.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieResponse.cookies.set({ name, value: "", ...options });
        },
      },
    });

    // Get current user from Supabase session cookies
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const userId = user?.id ?? `anon:${sessionId || "unknown"}`;
    const email = (user?.email || "").toLowerCase();

    // ✅ ADMIN users (your email) are never limited
    const isAdmin =
      email.length > 0 && ADMIN_EMAILS.includes(email as (typeof ADMIN_EMAILS)[number]);

    let plan = "free";

    // Try to read user's plan from your database (optional, adjust table/columns)
    if (userId && !userId.startsWith("anon:")) {
      const { data: billingRow } = await supabaseAdmin
        .from("billing_subscriptions")
        .select("plan, status")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();

      if (billingRow?.plan === "pro") {
        plan = "pro";
      }
    }

    if (isAdmin) {
      plan = "admin";
    }

    const limit = getLimitForPlan(plan);

    // Only enforce limits for non-admin users
    let used = 0;
    if (!isAdmin && !userId.startsWith("anon:")) {
      const { data: creditsRow, error: creditsError } = await supabaseAdmin
        .from<MessageCreditsRow>("ai_message_credits")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (creditsError) {
        console.error("[fix-coach] credits fetch error", creditsError);
      }

      const now = new Date();
      let resetAt = creditsRow?.reset_at ? new Date(creditsRow.reset_at) : null;

      // monthly reset example – adjust as you like
      if (!resetAt || resetAt < now) {
        // reset window: 30 days from now
        resetAt = new Date();
        resetAt.setDate(resetAt.getDate() + 30);

        const { data, error } = await supabaseAdmin
          .from("ai_message_credits")
          .upsert(
            {
              user_id: userId,
              plan,
              used_messages: 0,
              reset_at: resetAt.toISOString(),
            },
            { onConflict: "user_id" }
          )
          .select("used_messages")
          .maybeSingle();

        if (!error && data) {
          used = data.used_messages;
        }
      } else {
        used = creditsRow?.used_messages ?? 0;
      }

      if (used >= limit) {
        return NextResponse.json(
          {
            ok: false,
            error:
              plan === "free"
                ? "Free plan AI message limit reached. Upgrade to keep chatting with Rankcore.ai."
                : "AI message limit reached for your current plan.",
            remainingMessages: 0,
            plan,
          },
          { status: 429 }
        );
      }
    }

    // --- Call your AI model here ---
    // Replace this stub with your actual OpenAI / AI helper call.
    const fakeReply =
      "Here’s how to start fixing this issue. First, identify where the unused JavaScript is loaded (for example, third-party widgets or tracking scripts). Then move non-critical scripts to load after user interaction, or remove them if they are not needed.";

    // If not admin/anon, increment usage
    let remainingMessages = limit;
    if (!isAdmin && !userId.startsWith("anon:")) {
      const { data, error } = await supabaseAdmin
        .from("ai_message_credits")
        .update({ used_messages: used + 1 })
        .eq("user_id", userId)
        .select("used_messages")
        .maybeSingle();

      if (error) {
        console.error("[fix-coach] failed to increment usage", error);
      }

      const newUsed = data?.used_messages ?? used + 1;
      remainingMessages = Math.max(0, limit - newUsed);
    }

    // Optionally log the conversation to a separate table
    if (!userId.startsWith("anon:")) {
      supabaseAdmin
        .from("ai_message_logs")
        .insert({
          user_id: userId,
          plan,
          question,
          site_context: siteContext ?? null,
          reply: fakeReply,
          session_id: sessionId ?? null,
        })
        .catch((e) => console.error("[fix-coach] log insert error", e));
    }

    const headers = new Headers(cookieResponse.headers);
    headers.set("Content-Type", "application/json");

    return new NextResponse(
      JSON.stringify({
        ok: true,
        reply: fakeReply,
        remainingMessages,
        plan,
        isAdmin,
      }),
      { status: 200, headers }
    );
  } catch (err: any) {
    console.error("[fix-coach] unhandled error", err);
    return NextResponse.json(
      { ok: false, error: "Internal error in AI coach route." },
      { status: 500 }
    );
  }
}
