import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const ALLOWED_TIERS = new Set(["personal", "business", "agency"]);

function getStripe() {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(stripeKey, { apiVersion: "2024-06-20" });
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  try {
    const { tier, email, priceId } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }
    if (!priceId) {
      return NextResponse.json({ error: "Missing priceId" }, { status: 400 });
    }
    if (!tier || !ALLOWED_TIERS.has(tier)) {
      return NextResponse.json(
        { error: "Invalid tier. Must be personal, business, or agency." },
        { status: 400 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_SITE_URL" },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const supabaseAdmin = getSupabaseAdmin();

    // ✅ Fast lookup: get userId from profiles by email
    const { data: profile, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("id,email")
      .eq("email", email.toLowerCase())
      .single();

    if (profErr || !profile?.id) {
      return NextResponse.json(
        { error: "No Supabase profile found for this email. Please register first." },
        { status: 400 }
      );
    }

    const userId = profile.id;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        userId,
        plan: tier,
        email,
      },
      success_url: `${siteUrl}/auth/callback?next=/dashboard`,
      cancel_url: `${siteUrl}/pricing`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error("create-checkout-session error", e);
    return NextResponse.json(
      { error: e?.message ?? "Stripe error" },
      { status: 500 }
    );
  }
}
