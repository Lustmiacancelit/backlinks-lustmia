import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const pathname = req.nextUrl.pathname;

  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/api/scans");

  if (!isProtected) return res;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  // If env is missing, fail closed to landing (never 500)
  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  try {
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

    const { data: { user } } = await supabase.auth.getUser();

    // Not logged in → landing
    if (!user) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Subscription gate
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("subscription_status")
      .eq("id", user.id)
      .single();

    // If profiles read fails (RLS/table missing/etc) treat as inactive
    if (error || profile?.subscription_status !== "active") {
      return NextResponse.redirect(new URL("/pricing", req.url));
    }

    return res;
  } catch {
    // Any edge/runtime failure → landing
    return NextResponse.redirect(new URL("/", req.url));
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/scans/:path*"],
};
