"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Link2,
  Sparkles,
  ArrowRight,
  BarChart3,
  ShieldCheck,
  Globe,
} from "lucide-react";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

export default function HomePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // used by navbar Sign In / Sign Up → go to /login
  function goToLogin() {
    const trimmed = email.trim();
    if (trimmed) {
      try {
        localStorage.setItem("lead_email", trimmed);
      } catch {
        // ignore if localStorage not available
      }
    }
    router.push("/login");
  }

  // used by "Start free scan" → send magic link
  async function handleStartFreeScan() {
    const trimmed = email.trim();

    if (!trimmed) {
      setErrorMsg("Enter your email so we can send you a magic link.");
      setStatus("error");
      return;
    }

    setStatus("sending");
    setErrorMsg(null);

    // keep existing behaviour: store lead email for pricing / login
    try {
      localStorage.setItem("lead_email", trimmed);
    } catch {
      // ignore
    }

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/dashboard`
        : undefined;

    const { error } = await supabaseBrowserClient.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      console.error(error);
      setErrorMsg(
        "Could not send the magic link. Please try again in a moment.",
      );
      setStatus("error");
      return;
    }

    setStatus("sent");
  }

  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* background gradients like dib.io */}
      <div className="absolute inset-0 bg-gradient-to-b from-fuchsia-900/35 via-black to-black" />
      <div className="absolute w-[520px] h-[520px] bg-fuchsia-600/25 blur-3xl rounded-full -top-40 -left-40" />
      <div className="absolute w-[560px] h-[560px] bg-indigo-600/25 blur-3xl rounded-full -top-10 -right-40" />
      <div className="absolute w-[520px] h-[520px] bg-cyan-500/15 blur-3xl rounded-full bottom-[-220px] left-1/3" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-5 space-y-10">
        {/* NAVBAR */}
        <header className="flex items-center justify-between gap-4">
          {/* logo */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-fuchsia-300" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-semibold text-lg">Lustmia</span>
              <span className="text-[11px] text-white/60">
                Backlink Intelligence
              </span>
            </div>
          </div>

          {/* nav links */}
          <nav className="hidden md:flex items-center gap-6 text-sm text-white/70">
            <button
              className="hover:text-white"
              onClick={() =>
                document
                  .getElementById("features")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Features
            </button>
            <button
              className="hover:text-white"
              onClick={() => router.push("/pricing")}
            >
              Pricing
            </button>
            <button
              className="hover:text-white"
              onClick={() => router.push("/blog")}
            >
              Blog
            </button>
            <button
              className="hover:text-white"
              onClick={() => router.push("/about")}
            >
              About
            </button>
          </nav>

          {/* auth buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToLogin}
              className="px-4 py-2 rounded-xl text-sm text-white/80 hover:text-white"
            >
              Sign In
            </button>
            <button
              onClick={goToLogin}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-fuchsia-600 hover:bg-fuchsia-500"
            >
              Sign Up
            </button>
          </div>
        </header>

        {/* HERO SECTION */}
        <section className="grid gap-10 md:grid-cols-2 items-center pt-4">
          {/* left side */}
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/80">
              <Sparkles className="w-3.5 h-3.5 text-fuchsia-300" />
              New · AI-powered backlink sidekick
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
              Chat with your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-300">
                backlinks
              </span>
              .
            </h1>

            <p className="text-white/70 text-sm sm:text-base max-w-xl">
              Lustmia watches your backlink profile so you don&apos;t have to.
              See authority trends, find toxic links, and understand who&apos;s
              linking to you — all in one clean dashboard.
            </p>

            {/* Email + CTA */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl bg-black/40 border border-white/15 outline-none text-sm placeholder:text-white/35 focus:border-fuchsia-400"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleStartFreeScan}
                  disabled={status === "sending"}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-500 hover:opacity-90 text-sm font-semibold disabled:opacity-60"
                >
                  {status === "sending" ? "Sending magic link..." : "Start free scan"}
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() =>
                    document
                      .getElementById("features")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-white/10"
                >
                  Watch how it works
                </button>
              </div>

              <p className="text-[11px] text-white/50">
                We&apos;ll email you a magic link. No passwords. Free tier
                includes limited scans so you can try it safely.
              </p>

              {status === "sent" && (
                <p className="text-[11px] text-emerald-300">
                  Magic link sent! Check your inbox to open your dashboard.
                </p>
              )}

              {errorMsg && status !== "sent" && (
                <p className="text-[11px] text-red-300">{errorMsg}</p>
              )}
            </div>
          </div>

          {/* right side: fake chat / preview */}
          <div className="hidden md:flex items-center justify-center">
            <div className="w-full max-w-md rounded-3xl bg-black/40 border border-white/10 p-4 shadow-xl backdrop-blur">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-fuchsia-500 to-indigo-500 grid place-items-center text-xs font-bold">
                    L
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Lustmia Bot</div>
                    <div className="text-[11px] text-white/60">
                      Backlink assistant
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-emerald-300">
                  Monitoring · 24/7
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3 max-w-[80%]">
                  I found <b>42</b> new backlinks this week. 4 look risky — want
                  a quick summary?
                </div>
                <div className="flex justify-end">
                  <div className="rounded-2xl bg-fuchsia-600/80 px-3 py-2 max-w-[80%]">
                    Yes, show me the toxic ones and what to do.
                  </div>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3 max-w-[85%]">
                  3 links are from spam directories and 1 from a hacked blog.
                  I&apos;ve drafted outreach emails you can send in one click.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES STRIP */}
        <section id="features" className="pt-4 space-y-4">
          <h2 className="text-xl font-semibold">What Lustmia does for you</h2>
          <p className="text-sm text-white/65 max-w-2xl">
            Built for SEOs, founders, and agencies who want backlink clarity
            without spreadsheets or manual crawling.
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            <FeatureCard
              icon={<BarChart3 className="w-5 h-5 text-fuchsia-300" />}
              title="Authority trend"
              desc="Track DA / DR movement and backlink growth in one clean chart."
            />
            <FeatureCard
              icon={<ShieldCheck className="w-5 h-5 text-emerald-300" />}
              title="Toxicity detection"
              desc="Automatically flag spammy links before they can hurt rankings."
            />
            <FeatureCard
              icon={<Globe className="w-5 h-5 text-cyan-300" />}
              title="Referring domains"
              desc="See who is linking to you, from where, and how those links behave."
            />
          </div>
        </section>

        {/* FOOTER STRIP */}
        <section className="pt-6 border-t border-white/5 mt-4">
          <p className="text-[11px] text-white/50 mb-3 uppercase tracking-[0.2em]">
            Powered by industry technology
          </p>
          <div className="flex flex-wrap gap-6 items-center text-xs text-white/40">
            <span>Stripe</span>
            <span>Supabase</span>
            <span>Next.js</span>
            <span>TypeScript</span>
            <span>Tailwind CSS</span>
            <span>Vercel</span>
          </div>
        </section>
      </div>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      <p className="text-xs text-white/70">{desc}</p>
    </div>
  );
}
