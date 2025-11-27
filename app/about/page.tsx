import Link from "next/link";
import {
  Link2,
  Sparkles,
  Globe,
  ShieldCheck,
  BarChart3,
  Users,
  Target,
  HeartHandshake,
  ArrowRight,
} from "lucide-react";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* background gradients */}
      <div className="absolute inset-0 bg-gradient-to-b from-fuchsia-900/25 via-black to-black pointer-events-none" />
      <div className="absolute w-[520px] h-[520px] bg-fuchsia-600/25 blur-3xl rounded-full -top-40 -left-40 pointer-events-none" />
      <div className="absolute w-[560px] h-[560px] bg-indigo-500/20 blur-3xl rounded-full -top-32 -right-52 pointer-events-none" />
      <div className="absolute w-[480px] h-[480px] bg-cyan-500/10 blur-3xl rounded-full bottom-[-220px] left-1/3 pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-6 md:py-10 space-y-12">
        {/* NAV (simple, matches rest of app) */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-fuchsia-300" />
            </div>
            <span className="font-semibold tracking-tight text-sm md:text-base">
              Lustmia Backlinks
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-white/70">
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/pricing" className="hover:text-white transition-colors">
              Pricing
            </Link>
            <Link href="/about" className="text-white">
              About
            </Link>
          </nav>

          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/login"
              className="px-4 py-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition"
            >
              Sign in
            </Link>
            <Link
              href="/pricing"
              className="hidden sm:inline-flex px-4 py-1.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 font-semibold transition"
            >
              Get started
            </Link>
          </div>
        </header>

        {/* HERO / INTRO */}
        <section className="grid md:grid-cols-[3fr,2fr] gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/80">
              <Sparkles className="w-3.5 h-3.5 text-fuchsia-300" />
              Our story
            </div>

            <h1 className="mt-4 text-3xl md:text-4xl font-bold leading-tight">
              Built for SEOs who are tired of waking up to{" "}
              <span className="text-fuchsia-300">backlink surprises.</span>
            </h1>

            <p className="mt-4 text-sm md:text-base text-white/70 leading-relaxed">
              Lustmia Backlinks started as a tool we hacked together to protect
              a few client sites from spammy links and sudden authority drops.
              It quickly became obvious that the existing backlink tools were
              either too heavy, too noisy, or too slow to catch the problems
              that actually matter. We wanted something different: a clean,
              focused dashboard that tells you exactly what&apos;s happening to your
              link profile right now, and what you should do next.
            </p>

            <p className="mt-3 text-sm md:text-base text-white/70 leading-relaxed">
              Today, Lustmia helps founders, in-house SEOs and boutique
              agencies keep a permanent radar on their backlinks. No enterprise
              training, no 40-tab reports—just clear signal on authority
              trends, toxic clusters, and the competitors who are quietly
              catching up.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 font-semibold text-sm transition"
              >
                See pricing
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs md:text-sm"
              >
                View sample dashboard
              </Link>
            </div>
          </div>

          {/* “Illustration” panel */}
          <div className="hidden md:block">
            <div className="rounded-3xl bg-white/5 border border-white/10 p-5 shadow-[0_0_50px_rgba(0,0,0,0.7)]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-white/80">
                  Backlink story of a site like yours
                </span>
                <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/40">
                  Example view
                </span>
              </div>

              <div className="space-y-3 text-xs text-white/80">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-fuchsia-300" />
                    Authority over time
                  </span>
                  <span className="text-emerald-300">Stable, trending up</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-300" />
                    Toxic cluster alerts
                  </span>
                  <span className="text-emerald-300">Handled automatically</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-cyan-300" />
                    New referring domains
                  </span>
                  <span className="text-cyan-300">42 in the last 7 days</span>
                </div>
              </div>

              <div className="mt-5 h-28 rounded-2xl bg-gradient-to-r from-fuchsia-600/40 via-indigo-500/40 to-cyan-400/40 flex items-center justify-center text-[11px] text-white/80 text-center px-4">
                Imagine this panel filled with your own link graph, authority
                bands and risk zones. That&apos;s what Lustmia keeps updated for
                you—without you needing to log into five tools.
              </div>
            </div>
          </div>
        </section>

        {/* MISSION / VALUES */}
        <section className="grid md:grid-cols-3 gap-5 mt-4">
          <div className="md:col-span-2 space-y-4">
            <h2 className="text-xl md:text-2xl font-semibold">Why we exist</h2>
            <p className="text-sm md:text-base text-white/70 leading-relaxed">
              The modern SEO stack is noisy. Every week there is a new tool
              promising &quot;AI monitoring&quot; or &quot;link intelligence&quot;, but most
              dashboards still feel like spreadsheets with gradients. When our
              own projects and client sites were hit by low-quality link bursts
              and negative SEO, we realised the hardest part wasn&apos;t finding
              data—it was seeing the story inside the data fast enough to
              react.
            </p>
            <p className="text-sm md:text-base text-white/70 leading-relaxed">
              Lustmia is our answer to that. We focus on the few questions that
              actually matter: Is your authority decaying or growing? Are you
              picking up risky link patterns? Who is linking to your
              competitors that should probably know about you? Everything else
              is secondary. If we can show you these answers in under a minute,
              we&apos;re doing our job.
            </p>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Target className="w-4 h-4 text-fuchsia-300" />
              Our focus
            </div>
            <p className="text-xs text-white/70 leading-relaxed">
              Lustmia is not trying to be &quot;everything SEO&quot;. We specialize in
              backlinks and link health so we can go deeper, ship faster and
              stay obsessively aligned with what link builders and SEOs actually
              need day to day.
            </p>
          </div>
        </section>

        {/* VALUES CARDS */}
        <section className="mt-6 space-y-4">
          <h2 className="text-xl md:text-2xl font-semibold">
            The principles behind Lustmia Backlinks
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <BarChart3 className="w-4 h-4 text-fuchsia-300" />
                Clarity over noise
              </div>
              <p className="text-xs text-white/70 leading-relaxed">
                We design every screen so that you can answer a real business
                question—&quot;Are we safe?&quot;, &quot;Are we growing?&quot;, &quot;Are we under
                attack?&quot;—without hunting through filters or exports. If a metric
                doesn&apos;t help you decide, we hide it.
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                Protection first
              </div>
              <p className="text-xs text-white/70 leading-relaxed">
                Backlinks are an attack surface. Sudden spammy campaigns,
                cheap PBN packages, &quot;helpful&quot; directory blasts—these can hurt
                real brands. We treat Lustmia as a link-health firewall: always
                watching, always looking for weird patterns before they show up
                in rankings.
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <HeartHandshake className="w-4 h-4 text-cyan-300" />
                Built with SEOs, not just for them
              </div>
              <p className="text-xs text-white/70 leading-relaxed">
                Lustmia is shaped in conversation with agency owners, solo
                link builders and in-house leads. We ship features that remove
                real headaches: &quot;Can my client see this?&quot;, &quot;How do I prove
                toxic cleanup?&quot;, &quot;What changed since last month?&quot;
              </p>
            </div>
          </div>
        </section>

        {/* SMALL TEAM / HUMAN SECTION */}
        <section className="mt-8 grid md:grid-cols-[2fr,3fr] gap-6 items-start">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Users className="w-4 h-4 text-fuchsia-300" />
              A small, focused team
            </div>
            <p className="text-sm text-white/70 leading-relaxed">
              Lustmia is intentionally small. We don&apos;t have an enterprise
              sales team or a giant roadmap committee. That means we can listen,
              respond and ship in tight cycles. When users ask for better
              reporting for clients, or faster detection of a new spam pattern,
              we can put it on the board and move.
            </p>
            <p className="text-sm text-white/70 leading-relaxed">
              We care a lot about craft and reliability. Every alert we send
              represents someone&apos;s brand equity, revenue and team&apos;s work.
              That&apos;s a responsibility we take seriously.
            </p>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Globe className="w-4 h-4 text-indigo-300" />
              Where we&apos;re going
            </div>
            <p className="text-sm text-white/70 leading-relaxed">
              Over the next year, we&apos;re expanding Lustmia beyond monitoring
              into an opinionated &quot;link operations&quot; layer: smarter alerts,
              suggested disavow files, outreach targets based on your existing
              profile, and white-label reports that clients actually read.
            </p>
            <p className="text-sm text-white/70 leading-relaxed">
              Our goal isn&apos;t to be the loudest tool in your stack. We want to
              be the quiet one you rely on—the tab you open when you need the
              truth about your backlinks, and the one that quietly warns you
              before anything breaks.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-8 mb-10 rounded-2xl bg-gradient-to-r from-fuchsia-600/40 via-indigo-500/40 to-cyan-400/40 border border-white/15 p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-lg md:text-xl font-semibold">
              Ready to really understand your backlinks?
            </h3>
            <p className="mt-1 text-sm text-white/80 max-w-xl">
              Start with the free plan, plug in your primary domain and see how
              Lustmia explains your current link reality—authority, risk and
              opportunities—in a single place.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black/80 text-sm font-semibold border border-white/20 hover:bg-black"
            >
              View plans
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-sm"
            >
              Sign in
            </Link>
          </div>
        </section>

        <footer className="py-4 text-[11px] text-white/40 border-t border-white/10">
          © {new Date().getFullYear()} Lustmia. Built for people who actually
          care about backlinks.
        </footer>
      </div>
    </main>
  );
}
