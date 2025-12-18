"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Sparkles,
  ArrowRight,
  Link2,
  ShieldCheck,
  BarChart3,
} from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

type TierKey = "free" | "personal" | "business" | "agency";

/**
 * Stripe price IDs – read once at build time.
 */
const STRIPE_PRICE_IDS = {
  personal: process.env.NEXT_PUBLIC_STRIPE_PRICE_PERSONAL,
  business: process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS,
  agency: process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY,
};

const PLANS: Record<
  TierKey,
  {
    name: string;
    price: number;
    tagline: string;
    bullets: string[];
    priceId?: string;
    badge?: string;
    highlight?: boolean;
  }
> = {
  free: {
    name: "Free",
    price: 0,
    tagline: "Try the basics.",
    bullets: [
      "0 Pro scans / day (resets daily, UTC)",
      "Up to 50 links",
      "No scan history",
      "No exports",
      "Community support",
    ],
  },
  personal: {
    name: "Personal",
    price: 19,
    badge: "Best for Gmail",
    tagline: "For solo founders & creators.",
    bullets: [
      "5 Pro scans / day (resets daily, UTC)",
      "30-day history",
      "Basic toxicity score",
      "CSV export",
      "Weekly alerts",
    ],
    priceId: STRIPE_PRICE_IDS.personal || undefined,
  },
  business: {
    name: "Business",
    price: 49,
    badge: "Most popular",
    highlight: true,
    tagline: "For brands & teams.",
    bullets: [
      "25 Pro scans / day (resets daily, UTC)",
      "12-month history",
      "Competitor tracking",
      "Toxic link clusters",
      "PDF + CSV exports",
      "Daily alerts",
    ],
    priceId: STRIPE_PRICE_IDS.business || undefined,
  },
  agency: {
    name: "Agency",
    price: 129,
    tagline: "For multi-client work.",
    bullets: [
      "75 Pro scans / day (resets daily, UTC)",
      "Client workspaces",
      "White-label PDFs",
      "Priority queue",
      "Team access",
    ],
    priceId: STRIPE_PRICE_IDS.agency || undefined,
  },
};

function getSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return createBrowserClient(url, anon);
}

export default function PricingPage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [selected, setSelected] = useState<TierKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- hydrate email from URL, localStorage, then Supabase user ---
  useEffect(() => {
    (async () => {
      if (typeof window === "undefined") return;

      let found: string | null = null;

      // 1) ?email= in querystring
      try {
        const params = new URLSearchParams(window.location.search);
        found = params.get("email");
      } catch {
        // ignore
      }

      // 2) localStorage lead_email
      if (!found) {
        try {
          found = localStorage.getItem("lead_email");
        } catch {
          /* ignore */
        }
      }

      // 3) logged-in Supabase user
      if (!found) {
        const supabase = getSupabaseBrowser();
        if (supabase) {
          try {
            const { data } = await supabase.auth.getUser();
            if (data.user?.email) {
              found = data.user.email;
            }
          } catch {
            // ignore auth errors, fall back to null
          }
        }
      }

      if (found) {
        setEmail(found);
        try {
          localStorage.setItem("lead_email", found);
        } catch {
          /* ignore */
        }
      }
    })();
  }, []);

  const suggestedTier: TierKey = useMemo(() => {
    if (!email) return "business";
    const domain = email.split("@")[1]?.toLowerCase();
    if (domain === "gmail.com" || domain === "googlemail.com") return "personal";
    return "business";
  }, [email]);

  async function startCheckout(tier: TierKey) {
    setError(null);
    setSelected(tier);

    // Free plan → no Stripe, just register free account
    if (tier === "free") {
      router.push(
        `/register?free=1${
          email ? `&email=${encodeURIComponent(email)}` : ""
        }`,
      );
      return;
    }

    if (!email) {
      setError("Missing email. Sign in or enter your email on the homepage first.");
      setSelected(null);
      return;
    }

    const priceId = PLANS[tier].priceId;

    if (!priceId) {
      setError(
        `Missing Stripe Price ID for "${tier}". Check NEXT_PUBLIC_STRIPE_PRICE_* in .env.local (and Vercel for production).`,
      );
      setSelected(null);
      return;
    }

    try {
      const r = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, email, priceId }),
      });

      const data = await r.json();
      if (data?.url) {
        // Stripe Checkout
        window.location.href = data.url;
      } else {
        setError(data?.error || "Could not start checkout.");
        setSelected(null);
      }
    } catch (e: any) {
      setError(e?.message || "Network error starting checkout.");
      setSelected(null);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* dib.io style background */}
      <div className="absolute inset-0 bg-gradient-to-b from-fuchsia-900/20 via-black to-black" />
      <div className="absolute w-[520px] h-[520px] bg-fuchsia-600/20 blur-3xl rounded-full -top-40 -left-40" />
      <div className="absolute w-[560px] h-[560px] bg-indigo-600/15 blur-3xl rounded-full top-0 -right-52" />
      <div className="absolute w-[520px] h-[520px] bg-cyan-500/10 blur-3xl rounded-full bottom-[-200px] left-1/3" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-fuchsia-300" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/80">
                <Sparkles className="w-3.5 h-3.5 text-fuchsia-300" />
                Pricing unlocked
              </div>

              <h1 className="text-3xl md:text-4xl font-bold mt-2">
                Choose your plan
              </h1>

              <p className="text-white/70 mt-1 text-sm">
                {email ? (
                  <>
                    We&apos;ll collect your email during checkout:{" "}
                    <span className="text-fuchsia-300">{email}</span>
                  </>
                ) : (
                  <>Sign in or start a free trial to unlock personalized pricing.</>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* UPDATED: both go to /dashboard */}
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm"
            >
              Back to home
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-sm font-semibold"
            >
              Log in
            </button>
          </div>
        </header>

        {/* Error box */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-200 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Plans */}
        <section className="grid md:grid-cols-4 gap-4">
          {(Object.keys(PLANS) as TierKey[]).map((key) => {
            const plan = PLANS[key];
            const isSuggested = key === suggestedTier;

            return (
              <div
                key={key}
                className={[
                  "rounded-2xl p-5 border bg-white/5 backdrop-blur relative transition",
                  plan.highlight
                    ? "border-fuchsia-500 shadow-[0_0_0_1px_rgba(217,70,239,0.35)] scale-[1.02]"
                    : "border-white/10 hover:border-white/20",
                ].join(" ")}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="text-[11px] uppercase tracking-wider text-fuchsia-200 font-semibold mb-2">
                    {plan.badge}
                  </div>
                )}
                {isSuggested && !plan.badge && (
                  <div className="text-[11px] uppercase tracking-wider text-fuchsia-300 font-semibold mb-2">
                    Suggested
                  </div>
                )}

                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="text-white/60 text-sm mt-1">{plan.tagline}</p>

                <div className="mt-4 flex items-end gap-1">
                  <div className="text-4xl font-bold">${plan.price}</div>
                  <div className="text-white/60 text-sm mb-1">/mo</div>
                </div>

                <ul className="mt-4 space-y-2 text-sm text-white/80">
                  {plan.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-300 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => startCheckout(key)}
                  disabled={selected === key}
                  className={[
                    "mt-6 w-full py-2.5 rounded-xl font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2",
                    plan.price === 0
                      ? "bg-white/10 hover:bg-white/15 border border-white/10"
                      : "bg-fuchsia-600 hover:bg-fuchsia-500",
                  ].join(" ")}
                >
                  {plan.price === 0 ? "Start Free" : "Subscribe"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </section>

        {/* Feature strip (dib-style) */}
        <section className="grid md:grid-cols-3 gap-4 pt-2">
          {[
            {
              icon: <BarChart3 className="w-5 h-5 text-fuchsia-300" />,
              title: "Authority Trend",
              desc: "See DA velocity and backlink growth patterns.",
            },
            {
              icon: <ShieldCheck className="w-5 h-5 text-emerald-300" />,
              title: "Toxicity Detection",
              desc: "Spot spam clusters before they hurt ranking.",
            },
            {
              icon: <Link2 className="w-5 h-5 text-cyan-300" />,
              title: "Referring Domains",
              desc: "Track who links to you and why.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-white/5 border border-white/10 rounded-2xl p-5"
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                {f.icon}
              </div>
              <h3 className="mt-3 font-semibold text-lg">{f.title}</h3>
              <p className="mt-1 text-white/70 text-sm">{f.desc}</p>
            </div>
          ))}
        </section>

        <div className="text-xs text-white/50">
          Cancel anytime. Limits reset daily (UTC). Fair-use protection enabled.
        </div>
      </div>
    </main>
  );
}
