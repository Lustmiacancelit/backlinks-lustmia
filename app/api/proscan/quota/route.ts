// app/api/proscan/quota/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getTodayUTC(): string {
  const now = new Date();
  // YYYY-MM-DD in UTC
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY!;
    const defaultLimit = Number(process.env.PROSCAN_DAILY_LIMIT || 3);

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Supabase env vars missing" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const today = getTodayUTC();

    // Read existing usage row
    const { data: row, error: readErr } = await supabase
      .from("proscan_usage")
      .select("user_id, used, limit, period_start")
      .eq("user_id", userId)
      .maybeSingle();

    // If no row, create one
    if (readErr) {
      return NextResponse.json({ error: readErr.message }, { status: 500 });
    }

    if (!row) {
      const { data: inserted, error: insErr } = await supabase
        .from("proscan_usage")
        .insert({
          user_id: userId,
          used: 0,
          limit: defaultLimit,
          period_start: today,
        })
        .select("user_id, used, limit, period_start")
        .single();

      if (insErr) {
        return NextResponse.json({ error: insErr.message }, { status: 500 });
      }

      return NextResponse.json({
        userId: inserted.user_id,
        used: inserted.used,
        limit: inserted.limit,
        remaining: Math.max(0, inserted.limit - inserted.used),
        period_start: inserted.period_start,
        reset_at: today,
      });
    }

    // Reset if period_start is not today
    if (row.period_start !== today) {
      const { data: resetRow, error: resetErr } = await supabase
        .from("proscan_usage")
        .update({
          used: 0,
          period_start: today,
          limit: row.limit ?? defaultLimit,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .select("user_id, used, limit, period_start")
        .single();

      if (resetErr) {
        return NextResponse.json({ error: resetErr.message }, { status: 500 });
      }

      return NextResponse.json({
        userId: resetRow.user_id,
        used: resetRow.used,
        limit: resetRow.limit,
        remaining: Math.max(0, resetRow.limit - resetRow.used),
        period_start: resetRow.period_start,
        reset_at: today,
      });
    }

    // Normal return
    return NextResponse.json({
      userId: row.user_id,
      used: row.used ?? 0,
      limit: row.limit ?? defaultLimit,
      remaining: Math.max(0, (row.limit ?? defaultLimit) - (row.used ?? 0)),
      period_start: row.period_start,
      reset_at: today,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Quota endpoint failed" },
      { status: 500 }
    );
  }
}
