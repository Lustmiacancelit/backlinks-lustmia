import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Only protect dashboard + scans API
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/api/scans");

  // Public routes (/, /pricing, /about, /login, /register, etc.)
  if (!isProtected) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnon) {
    // If env vars are broken, at least send to login
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

    // ❌ Not logged in → send to login, remember where they were going
    if (!user) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("next", pathname); // so after login they go to /dashboard
      return NextResponse.redirect(loginUrl);
    }

    // ✅ Logged in → ALWAYS allow dashboard, regardless of free / paid
    // (free users see the Upgrade button & are limited by proscan/quota)
    return res;
  } catch (err) {
    console.error("middleware auth error", err);
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/scans/:path*"],
};
