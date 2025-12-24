import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const next = url.searchParams.get("next") || "/dashboard";

  const code = url.searchParams.get("code");

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

  if (!code) {
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("next", next);
    loginUrl.searchParams.set(
      "error",
      "Missing auth code. Please request a new magic link."
    );
    return NextResponse.redirect(loginUrl);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("next", next);
    loginUrl.searchParams.set("error", "Supabase configuration error.");
    return NextResponse.redirect(loginUrl);
  }

  // ✅ Create the redirect response up-front
  const redirectResponse = NextResponse.redirect(new URL(next, url.origin));

  // ✅ SSR client writes cookies onto redirectResponse
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return req.cookies.get(name)?.value;
      },
      set(name, value, options) {
        redirectResponse.cookies.set({ name, value, ...options });
      },
      remove(name, options) {
        redirectResponse.cookies.set({ name, value: "", ...options });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("next", next);
    loginUrl.searchParams.set("error", error.message);
    return NextResponse.redirect(loginUrl);
  }

  // ✅ Cookies are already attached to redirectResponse
  return redirectResponse;
}
