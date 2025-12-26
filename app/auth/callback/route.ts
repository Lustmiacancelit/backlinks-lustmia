import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const next = url.searchParams.get("next") || "/dashboard";
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL(`/login?error=Missing auth code&next=${next}`, url.origin)
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const res = new NextResponse();

  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      get: (name) => req.cookies.get(name)?.value,
      set: (name, value, options) =>
        res.cookies.set({ name, value, ...options }),
      remove: (name, options) =>
        res.cookies.set({ name, value: "", ...options }),
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(error.message)}&next=${next}`,
        url.origin
      )
    );
  }

  return NextResponse.redirect(new URL(next, url.origin), {
    headers: res.headers,
  });
}
