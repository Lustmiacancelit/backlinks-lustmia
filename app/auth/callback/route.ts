import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const next = url.searchParams.get("next") || "/dashboard";

  // Supabase magic links commonly return ?code=... (PKCE)
  const code = url.searchParams.get("code");

  // Handle errors coming back from Supabase
  const errorDescription =
    url.searchParams.get("error_description") ||
    url.searchParams.get("error") ||
    "";

  if (errorDescription) {
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("next", next);
    loginUrl.searchParams.set("error", errorDescription);
    return NextResponse.redirect(loginUrl);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnon) {
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("next", next);
    loginUrl.searchParams.set("error", "Missing Supabase env vars.");
    return NextResponse.redirect(loginUrl);
  }

  // This response object will receive cookies
  const res = NextResponse.next();

  // Create SSR client that can READ/WRITE cookies
  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
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

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const loginUrl = new URL("/login", url.origin);
      loginUrl.searchParams.set("next", next);
      loginUrl.searchParams.set("error", error.message);
      return NextResponse.redirect(loginUrl);
    }

    // IMPORTANT: redirect using the same headers that include Set-Cookie
    return NextResponse.redirect(new URL(next, url.origin), {
      headers: res.headers,
    });
  }

  // If the link doesn't contain ?code=..., we can't complete login
  const loginUrl = new URL("/login", url.origin);
  loginUrl.searchParams.set("next", next);
  loginUrl.searchParams.set("error", "Missing auth code in magic link.");
  return NextResponse.redirect(loginUrl);
}
