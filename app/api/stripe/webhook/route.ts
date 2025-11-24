import Stripe from "stripe";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // service role key (server only)
);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = headers().get("stripe-signature");

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // We only handle subscription lifecycle events
  if (event.type.startsWith("customer.subscription.")) {
    const sub = event.data.object as Stripe.Subscription;

    // You must store supabase user_id in Stripe metadata when creating checkout
    const userId = (sub.metadata?.user_id || "") as string;
    const planId = (sub.metadata?.plan_id || "free") as string;

    if (!userId) {
      return Response.json({ ok: false, error: "Missing metadata.user_id" }, { status: 200 });
    }

    const upsertPayload = {
      user_id: userId,
      plan_id: planId,
      stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      stripe_subscription_id: sub.id,
      status: sub.status,
      current_period_end: sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: sub.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from("proscan_subscriptions")
      .upsert(upsertPayload);

    if (error) {
      console.error("Supabase upsert error:", error);
      return Response.json({ ok: false }, { status: 200 });
    }
  }

  return Response.json({ ok: true });
}
