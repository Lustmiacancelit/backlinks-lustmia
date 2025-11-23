import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

type QuotaRecord = {
  used: number;
  limit: number;
  resetAt: number; // timestamp (ms)
};

// VERY LIGHT MVP STORE (in-memory). Replace with Supabase later.
const store = new Map<string, QuotaRecord>();

const PRO_LIMIT_FREE = 5; // free tier pro scans per month

function monthResetTimestamp() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.getTime();
}

function getOrCreate(userId: string): QuotaRecord {
  const existing = store.get(userId);
  const now = Date.now();

  if (existing && existing.resetAt > now) return existing;

  const fresh: QuotaRecord = {
    used: 0,
    limit: PRO_LIMIT_FREE,
    resetAt: monthResetTimestamp(),
  };
  store.set(userId, fresh);
  return fresh;
}

export async function POST(req: NextRequest) {
  try {
    const { userId, action } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const rec = getOrCreate(userId);

    if (action === "consume") {
      if (rec.used >= rec.limit) {
        return NextResponse.json(
          {
            ok: false,
            blocked: true,
            message: "Pro Scan quota exceeded",
            quota: rec,
          },
          { status: 402 }
        );
      }
      rec.used += 1;
      store.set(userId, rec);
    }

    return NextResponse.json({
      ok: true,
      quota: rec,
      remaining: Math.max(0, rec.limit - rec.used),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Quota check failed" },
      { status: 500 }
    );
  }
}

// Optional GET for quick visibility
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") || "";
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }
  const rec = getOrCreate(userId);
  return NextResponse.json({
    ok: true,
    quota: rec,
    remaining: Math.max(0, rec.limit - rec.used),
  });
}
