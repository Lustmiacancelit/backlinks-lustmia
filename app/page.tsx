// app/page.tsx

import Link from "next/link";
import { ArrowRight, Play, ShieldCheck, BarChart3, Link2 } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* soft gradients like dib.io */}
      <div className="absolute inset-0 bg-gradient-to-b from-fuchsia-900/25 via-black to-black pointer-events-none" />
      <div className="absolute w-[520px] h-[520px] bg-fuchsia-600/20 blur-3xl rounded-full -top-40 -left-40 pointer-events-none" />
      <div className="absolute w-[560px] h-[560px] bg-indigo-500/20 blur-3xl rounded-full -top-32 -right-52 pointer-events-none" />
      <div className="absolute w-[480px] h-[480px] bg-cyan-500/10 blur-3xl rounded-full bottom-[-220px] left-1/3 pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-4 md:py-6">
        {/* ───────────────── NAVBAR ───────────────── */}
        <nav className="flex items-center justify-between py-3">
          {/* logo */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-fuchsia-300" />
            </div>
            <span className="font-semibold tracking-tight">
              Lustmia Backlinks
            </span>
          </div>

          {/* center links */}
          <div className="hidden md:flex items-center gap-6 text-sm text-white/70">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <Link
              href="/pricing"
              className="hover:text-white transition-colors"
            >
              Pricing
            </Link>
            <a href="#blog" className="hover:text-white transition-colors">
              Blog
            </a>
            <a href="#about" className="hover:text-white transition-colors">
              About
            </a>
          </div>

          {/* right buttons */}
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/login"
              className="hidden sm:inline-flex px-4 py-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition"
            >
              Sign in
            </Link>
            <Link
              href="/pricing"
              className="inline-flex px-4 py-1.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 font-semibold transition"
            >
              Sign up
            </Link>
          </div>
        </nav>

        {/* ───────────────── HERO ───────────────── */}
        <section className="mt-10 md:mt-14 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/80">
              <span className="text-fuchsia-300 text-base">★</span>
              <span>Backlink monitoring, but actually simple.</span>
            </div>

            <h1 className="mt-4 text-3xl md:text-5xl font-bold leading-tight">
              See every backlink.
              <br />
              <span className="text-fuchsia-300">
                Kill spam before it kills ranking.
              </span>
            </h1>

            <p className="mt-4 text-white/70 text-sm md:text-base max-w-xl">
              Lustmia Backlinks watches your link profile 24/7: authority
              trends, toxic clusters, competitor moves and more—so you don&apos;t
              wake up to a tanked SERP.
            </p>

            {/* CTA row */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {/* main: goes straight to pricing, like Dib "Start free trial" */}
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 font-semibold text-sm md:text-base transition"
              >
                Start free
                <ArrowRight className="w-4 h-4" />
              </Link>

              {/* secondary: placeholder watch video */}
              <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-sm">
                <Play className="w-4 h-4" />
                Watch demo
              </button>

              <p className="w-full text-xs text-white/60 mt-1">
                No credit card for the free plan. Upgrade only if you love it.
              </p>
            </div>
          </div>

          {/* Right side: simple “app preview” box instead of Dib chat */}
          <div className="hidden md:block">
            <div className="rounded-3xl bg-white/5 border border-white/10 p-4 shadow-[0_0_40px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-white/80">
                  Backlink Health Preview
                </span>
                <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/40">
                  Live sample
                </span>
              </div>

              <div className="space-y-3 text-xs text-white/80">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-fuchsia-300" />
                    Authority trend
                  </span>
                  <span className="text-emerald-300">+27%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-300" />
                    Toxic links blocked
                  </span>
                  <span className="text-emerald-300">18 domains</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-cyan-300" />
                    New referring domains
                  </span>
                  <span className="text-cyan-300">+42 this week</span>
                </div>
              </div>

              <div className="mt-5 h-24 rounded-2xl bg-gradient-to-r from-fuchsia-600/40 via-indigo-500/40 to-cyan-400/40 flex items-center justify-center text-xs text-white/80">
                Simple graph placeholder — you can later swap this
                for your real chart.
              </div>
            </div>
          </div>
        </section>

        {/* ───────────────── FEATURES SECTION ───────────────── */}
        <section id="features" className="mt-16 md:mt-20 space-y-6">
          <h2 className="text-xl md:text-2xl font-semibold">
            Everything you need to stay ahead of your backlinks.
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <BarChart3 className="w-5 h-5 text-fuchsia-300" />
              <h3 className="mt-3 font-semibold text-sm">Authority radar</h3>
              <p className="mt-1 text-xs text-white/70">
                Track DA / DR trends, link velocity and growth in a single
                view, so you don&apos;t miss gradual declines.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
              <h3 className="mt-3 font-semibold text-sm">Toxicity firewall</h3>
              <p className="mt-1 text-xs text-white/70">
                Spot PBNs, spam clusters and risky anchors before they trigger
                manual actions or algorithm hits.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <Link2 className="w-5 h-5 text-cyan-300" />
              <h3 className="mt-3 font-semibold text-sm">Competitor tracking</h3>
              <p className="mt-1 text-xs text-white/70">
                Watch who is linking to your competitors and find new outreach
                opportunities automatically.
              </p>
            </div>
          </div>
        </section>

        {/* ───────────────── BLOG / ABOUT PLACEHOLDERS ───────────────── */}
        <section id="blog" className="mt-16 md:mt-20">
          <h2 className="text-xl font-semibold mb-2">Blog</h2>
          <p className="text-sm text-white/60">
            Coming soon — backlink teardown case studies, link spam post-mortems
            and outreach playbooks.
          </p>
        </section>

        <section id="about" className="mt-12 mb-10">
          <h2 className="text-xl font-semibold mb-2">About Lustmia</h2>
          <p className="text-sm text-white/60">
            Lustmia Backlinks is built for SEOs, agencies and founders who want
            a clear view of their link profile without enterprise bloat. Simple
            dashboards, actionable alerts, no fluff.
          </p>
        </section>

        <footer className="py-4 text-[11px] text-white/40 border-t border-white/10">
          © {new Date().getFullYear()} Lustmia. All rights reserved.
        </footer>
      </div>
    </main>
  );
}
