import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      get(name) {
        return request.headers
          .get("cookie")
          ?.split("; ")
          .find((c) => c.startsWith(name + "="))
          ?.split("=")[1];
      },
      set() {},
      remove() {},
    },
  });

  const { data, error } = await supabase.auth.getUser();

  return NextResponse.json({
    ok: !error,
    user: data?.user ?? null,
    hasSession: !!data?.user,
    error: error?.message ?? null,
  });
}
