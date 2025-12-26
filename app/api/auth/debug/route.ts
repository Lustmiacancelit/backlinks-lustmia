// app/api/auth/debug/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.json(
      { user: null, error: "Missing Supabase env vars" },
      { status: 500 }
    );
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      get(name) {
        return req.cookies.get(name)?.value;
      },
      // we’re only *reading* cookies in this debug route, so set/remove can be no-ops
      set() {},
      remove() {},
    },
  });

  const { data, error } = await supabase.auth.getUser();

  return NextResponse.json(
    {
      user: data?.user ?? null,
      error: error?.message ?? null,
      hasSession: !!data?.user,
    },
    { status: 200 }
  );
}
