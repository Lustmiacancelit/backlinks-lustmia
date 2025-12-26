// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const pathname = url.pathname;

  // 1) If Supabase sends ?code=... or ?error=... anywhere,
  //    send it through /auth/callback EXACTLY once.
  const hasCode = url.searchParams.has("code");
  const hasError =
    url.searchParams.has("error") || url.searchParams.has("error_description");

  if (pathname !== "/auth/callback" && (hasCode || hasError)) {
    const next = url.searchParams.get("next") || "/dashboard";
    const callbackUrl = new URL("/auth/callback", url.origin);

    // preserve auth params
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");

    if (code) callbackUrl.searchParams.set("code", code);
    if (error) callbackUrl.searchParams.set("error", error);
    if (errorDescription) {
      callbackUrl.searchParams.set("error_description", errorDescription);
    }

    callbackUrl.searchParams.set("next", next);

    return NextResponse.redirect(callbackUrl);
  }

  // 2) Only protect /dashboard and /api/scans/*
  const isProtected =
    pathname.startsWith("/dashboard") || pathname.startsWith("/api/scans");

  if (!isProtected) {
    // public routes just continue
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnon) {
    // env broken: safest thing is send to /login
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const res = NextResponse.next();

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

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Not logged in → send to /login with ?next=
    if (!user) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Logged in → allow dashboard/api
    return res;
  } catch (err) {
    console.error("middleware auth error", err);
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

// 3) Match everything except static assets, so we can catch "/?code=..."
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
