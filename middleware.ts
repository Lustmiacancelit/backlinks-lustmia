import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const pathname = url.pathname;

  /**
   * 1) IMPORTANT FIX:
   * If Supabase sends the user back to "/" (or any route) with ?code=...,
   * force them through /auth/callback so we can exchange the code for a session cookie.
   */
  const hasCode = url.searchParams.has("code");
  const hasError =
    url.searchParams.has("error") || url.searchParams.has("error_description");

  // Never redirect if we're already on the callback route (avoid loops)
  if (pathname !== "/auth/callback" && (hasCode || hasError)) {
    const next = url.searchParams.get("next") || "/dashboard";

    const callbackUrl = new URL("/auth/callback", url.origin);

    // preserve the auth params supabase sent
    if (url.searchParams.get("code")) {
      callbackUrl.searchParams.set("code", url.searchParams.get("code")!);
    }
    if (url.searchParams.get("error")) {
      callbackUrl.searchParams.set("error", url.searchParams.get("error")!);
    }
    if (url.searchParams.get("error_description")) {
      callbackUrl.searchParams.set(
        "error_description",
        url.searchParams.get("error_description")!,
      );
    }

    callbackUrl.searchParams.set("next", next);

    return NextResponse.redirect(callbackUrl);
  }

  /**
   * 2) Protect dashboard + scans API only (same as you had)
   */
  const isProtected =
    pathname.startsWith("/dashboard") || pathname.startsWith("/api/scans");

  if (!isProtected) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnon) {
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

    if (!user) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return res;
  } catch (err) {
    console.error("middleware auth error", err);
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

/**
 * Match everything except Next static assets.
 * This is required so we can catch "/?code=..." and redirect to /auth/callback.
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
