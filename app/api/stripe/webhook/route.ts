import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/** Create Supabase admin client only at runtime (NOT build time) */
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, key);
}

/** Create Stripe client only at runtime (NOT build time) */
function getStripe() {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) throw new Error("Missing STRIPE_SECRET_KEY");

  return new Stripe(stripeKey, { apiVersion: "2024-06-20" });
}

export async function POST(req: Request) {
  try {
    const stripe = getStripe();
    const supabaseAdmin = getSupabaseAdmin();

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error("Missing STRIPE_WEBHOOK_SECRET");

    // Stripe needs the RAW body for signature verification
    const rawBody = await req.text();
    const sig = req.headers.get("stripe-signature");
    if (!sig) {
      return NextResponse.json(
        { ok: false, error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err: any) {
      return NextResponse.json(
        { ok: false, error: `Invalid signature: ${err.message}` },
        { status: 400 }
      );
    }

    // Helper to upsert subscription safely
    async function upsertSubscription(payload: any) {
      const { error } = await supabaseAdmin
        .from("proscan_subscriptions")
        .upsert(payload, { onConflict: "stripe_subscription_id" });

      if (error) {
        console.error("Supabase upsert error:", error);
        // still return 200 so Stripe doesn't retry forever
        return NextResponse.json({ ok: false }, { status: 200 });
      }

      return null;
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const userId = session.metadata?.userId || null;
        const plan = session.metadata?.plan || "pro";

        const stripeCustomerId =
          typeof session.customer === "string" ? session.customer : null;

        const stripeSubscriptionId =
          typeof session.subscription === "string" ? session.subscription : null;

        if (stripeSubscriptionId) {
          const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);

          const upsertPayload = {
            user_id: userId,
            plan,
            status: sub.status,
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: sub.id,
            current_period_end: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
            cancel_at_period_end: sub.cancel_at_period_end ?? false,
            updated_at: new Date().toISOString(),
          };

          const resp = await upsertSubscription(upsertPayload);
          if (resp) return resp;
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        const upsertPayload = {
          stripe_subscription_id: sub.id,
          stripe_customer_id:
            typeof sub.customer === "string" ? sub.customer : null,
          status: sub.status,
          current_period_end: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null,
          cancel_at_period_end: sub.cancel_at_period_end ?? false,
          updated_at: new Date().toISOString(),
        };

        const resp = await upsertSubscription(upsertPayload);
        if (resp) return resp;

        break;
      }

      default:
        // ignore other events
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Stripe webhook error:", e);
    return NextResponse.json(
      { ok: false, error: e.message || "Webhook failed" },
      { status: 500 }
    );
  }
}
