// app/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;

  const next = url.searchParams.get("next") || "/dashboard";
  const code = url.searchParams.get("code");

  const errorDescription =
    url.searchParams.get("error_description") || url.searchParams.get("error") || "";

  // If Supabase sent an error back in the URL, send the user to /login with that error
  if (errorDescription) {
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("next", next);
    loginUrl.searchParams.set("error", errorDescription);
    return NextResponse.redirect(loginUrl);
  }

  // No code = we can't finish login
  if (!code) {
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("next", next);
    loginUrl.searchParams.set("error", "Missing auth code.");
    return NextResponse.redirect(loginUrl);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[auth/callback] Missing Supabase env vars");
    return NextResponse.json(
      { error: "Supabase configuration error" },
      { status: 500 }
    );
  }

  // We create *one* redirect response and let Supabase attach cookies to it.
  const redirectResponse = NextResponse.redirect(new URL(next, url.origin));

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

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth/callback] exchangeCodeForSession error", error);
      const loginUrl = new URL("/login", url.origin);
      loginUrl.searchParams.set("next", next);
      loginUrl.searchParams.set("error", error.message);
      return NextResponse.redirect(loginUrl);
    }

    // ✅ At this point, Supabase has written the auth cookies onto redirectResponse
    return redirectResponse;
  } catch (err) {
    console.error("[auth/callback] unhandled error", err);
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("next", next);
    loginUrl.searchParams.set("error", "Unexpected error while finishing login.");
    return NextResponse.redirect(loginUrl);
  }
}
