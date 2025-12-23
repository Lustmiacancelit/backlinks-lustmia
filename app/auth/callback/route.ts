import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// IMPORTANT:
// This route runs on the server (route handler).
// It verifies magic-link params and then redirects to /dashboard (or ?next=...).

export async function GET(request: Request) {
  const url = new URL(request.url);

  // Supports your existing ?next=/dashboard usage
  const next = url.searchParams.get("next") || "/dashboard";

  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type"); // usually "magiclink" or "email"

  // If Supabase returns errors as query params/fragments, handle gracefully
  const error_description =
    url.searchParams.get("error_description") ||
    url.searchParams.get("error") ||
    "";

  if (error_description) {
    // Send user back to login with a readable message
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("next", next);
    loginUrl.searchParams.set("error", error_description);
    return NextResponse.redirect(loginUrl);
  }

  // If we don't have token_hash/type, just go home (or login)
  if (!token_hash || !type) {
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("next", next);
    loginUrl.searchParams.set("error", "Missing magic link parameters.");
    return NextResponse.redirect(loginUrl);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Server-side client (no cookies here). We'll verify the OTP and then
  // redirect back to the app; the browser-side client will now have a valid session.
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { error } = await supabase.auth.verifyOtp({
    type: type as any,
    token_hash,
  });

  if (error) {
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("next", next);
    loginUrl.searchParams.set("error", error.message);
    return NextResponse.redirect(loginUrl);
  }

  // Success → straight to dashboard
  return NextResponse.redirect(new URL(next, url.origin));
}
