"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

import DashboardLayout from "@/components/DashboardLayout";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Bug,
  Link2Off,
  TrendingDown,
  Brain,
  Info,
} from "lucide-react";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

function MetricCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl p-4 bg-black/40 border border-white/10 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 rounded-xl bg-white/5 border border-white/10">
          {icon}
        </div>
      </div>
      <div className="text-xs text-white/60">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      <div className="mt-1 text-[11px] text-white/50">{helper}</div>
    </div>
  );
}

export default function ToxicLinksPage() {
  // Demo metrics for now (can be wired to real data later)
  const totalBacklinks = 120;
  const toxicLinks = 9;
  const toxicPercent =
    totalBacklinks === 0 ? 0 : Math.round((toxicLinks / totalBacklinks) * 100);
  const highRiskDomains = 3;

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [sweepsEnabled, setSweepsEnabled] = useState(false);
  const [sweepDomain, setSweepDomain] = useState<string>("");

  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);

  const isInternal =
    userEmail?.toLowerCase() === "sales@lustmia.com" ||
    userEmail?.toLowerCase() === "sales@lustmia.com.br";

  useEffect(() => {
    supabaseBrowserClient.auth
      .getUser()
      .then(({ data }) => {
        if (data.user) {
          setUserEmail(data.user.email || null);
          setUserId(data.user.id || null);

          // if no domain yet, default to email's domain
          const email = data.user.email || "";
          if (email.includes("@")) {
            const domainGuess = email.split("@")[1];
            if (domainGuess && !sweepDomain) {
              setSweepDomain(domainGuess.toLowerCase());
            }
          }
        }
      })
      .catch(() => {});

    // Restore toggle from localStorage for UX (true source is Supabase)
    if (typeof window !== "undefined") {
      try {
        const storedEnabled = window.localStorage.getItem(
          "lustmia_toxic_sweeps_enabled",
        );
        if (storedEnabled === "1") setSweepsEnabled(true);

        const storedDomain = window.localStorage.getItem(
          "lustmia_toxic_sweeps_domain",
        );
        if (storedDomain && !sweepDomain) setSweepDomain(storedDomain);
      } catch {
        /* ignore */
      }
    }

    setHydrated(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        "lustmia_toxic_sweeps_enabled",
        sweepsEnabled ? "1" : "0",
      );
      if (sweepDomain) {
        window.localStorage.setItem("lustmia_toxic_sweeps_domain", sweepDomain);
      }
    } catch {
      /* ignore */
    }
  }, [sweepsEnabled, sweepDomain, hydrated]);

  async function saveSweepSettings(nextEnabled: boolean, nextDomain: string) {
    if (!userId || !nextDomain) return;
    try {
      setSaving(true);
      await fetch("/api/toxic-sweeps/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          enabled: nextEnabled,
          domain: nextDomain.trim(),
          cadenceDays: 30,
        }),
      });
    } catch {
      // fail silently for now
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout active="toxic-links">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          {userEmail && (
            <p className="text-xs text-white/50 mb-0.5">Hi {userEmail}</p>
          )}
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Toxic Links
          </h1>
          <p className="text-white/60 text-sm">
            Understand what “toxic links” are, how Lustmia flags them, and what
            to do about them — with AI guidance.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-white/60">
          <ShieldAlert className="h-4 w-4 text-red-300" />
          <span>
            Goal: keep toxic links &lt;{" "}
            <span className="font-semibold text-white">5%</span> of your total
            profile.
          </span>
        </div>
      </header>

      {/* METRICS STRIP */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MetricCard
          icon={<Link2Off className="h-5 w-5 text-pink-300" />}
          label="Total backlinks scanned"
          value={totalBacklinks}
          helper="Links we’ve seen pointing at your site."
        />
        <MetricCard
          icon={<ShieldAlert className="h-5 w-5 text-red-300" />}
          label="Toxic links flagged"
          value={toxicLinks}
          helper="Links with high spam / risk signals."
        />
        <MetricCard
          icon={<TrendingDown className="h-5 w-5 text-amber-300" />}
          label="Toxic percentage"
          value={`${toxicPercent}%`}
          helper="Toxic links ÷ total links."
        />
        <MetricCard
          icon={<ShieldCheck className="h-5 w-5 text-emerald-300" />}
          label="High-risk domains"
          value={highRiskDomains}
          helper="Domains we recommend reviewing first."
        />
      </section>

      {/* 1. WHAT ARE TOXIC LINKS? */}
      <section className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="h-4 w-4 text-red-300" />
            <h2 className="font-semibold text-lg">What are toxic links?</h2>
          </div>
          <p className="text-sm text-white/70 mb-3">
            A <span className="font-semibold">toxic link</span> is a backlink
            that looks unnatural, spammy, or manipulative to search engines.
            These links don’t help your rankings — they can{" "}
            <span className="font-semibold">hurt trust</span> and in extreme
            cases contribute to manual penalties or algorithmic drops.
          </p>

          <p className="text-xs text-white/60 mb-2">
            Lustmia flags links as toxic when they match patterns like:
          </p>

          <ul className="text-sm text-white/80 space-y-1 list-disc list-inside">
            <li>
              <span className="font-semibold">Spam directories</span> and
              low-quality “SEO link farms.”
            </li>
            <li>
              <span className="font-semibold">Hacked pages</span> or injected
              links on compromised sites.
            </li>
            <li>
              <span className="font-semibold">Over-optimized anchors</span>{" "}
              (“best cheap shoes buy now”) repeated too often.
            </li>
            <li>
              <span className="font-semibold">Irrelevant niches</span> that
              don’t match your industry at all (e.g. casino / pharma).
            </li>
            <li>
              <span className="font-semibold">Mass site-wide footer links</span>{" "}
              that exist purely to manipulate PageRank.
            </li>
          </ul>
        </div>

        <div className="rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-2">
            <Bug className="h-4 w-4 text-amber-300" />
            <h2 className="font-semibold text-lg">
              Why search engines dislike them
            </h2>
          </div>

          <p className="text-sm text-white/70 mb-3">
            Modern algorithms are built to reward{" "}
            <span className="font-semibold">real recommendations</span> from
            reputable sites. When your profile is flooded with toxic links, it
            sends the opposite signal:
          </p>

          <ul className="text-sm text-white/80 space-y-1 list-disc list-inside">
            <li>It looks like you’re trying to “buy” or automate authority.</li>
            <li>
              It makes it harder for Google to trust the good links you’ve
              earned.
            </li>
            <li>
              It increases the chance of algorithmic downgrades or manual
              actions.
            </li>
          </ul>

          <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white/70 flex gap-2">
            <Info className="h-3 w-3 mt-0.5 text-cyan-300" />
            <span>
              You don’t need <span className="font-semibold">zero</span> toxic
              links. Everyone gets spammed. The goal is to{" "}
              <span className="font-semibold">monitor</span>,{" "}
              <span className="font-semibold">document</span>, and{" "}
              <span className="font-semibold">neutralize</span> the worst ones.
            </span>
          </div>
        </div>
      </section>

      {/* 2. HOW LUSTMIA FLAGS TOXICITY */}
      <section className="rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="h-4 w-4 text-fuchsia-300" />
          <h2 className="font-semibold text-lg">How Lustmia classifies toxic links</h2>
        </div>

        <p className="text-sm text-white/70 mb-4">
          Our scoring is AI-assisted. Every backlink gets a{" "}
          <span className="font-semibold">toxicity score</span> from low to
          high. We look at patterns that are hard to fake:
        </p>

        <div className="grid md:grid-cols-3 gap-4 text-sm text-white/80">
          <div className="rounded-xl bg-white/5 border border-white/10 p-3">
            <p className="font-semibold mb-1">Domain quality</p>
            <ul className="list-disc list-inside space-y-1 text-xs text-white/70">
              <li>Age, authority and historical trust.</li>
              <li>Whether the site itself has spammy backlinks.</li>
              <li>Thin, AI-spun or hacked content patterns.</li>
            </ul>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-3">
            <p className="font-semibold mb-1">Anchor & placement</p>
            <ul className="list-disc list-inside space-y-1 text-xs text-white/70">
              <li>Exact-match “money” anchors repeated across many sites.</li>
              <li>Links buried in comment spam, widgets or footers.</li>
              <li>Links placed next to adult, casino or pharma content.</li>
            </ul>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-3">
            <p className="font-semibold mb-1">Link patterns</p>
            <ul className="list-disc list-inside space-y-1 text-xs text-white/70">
              <li>Sudden bursts of links from the same IP / network.</li>
              <li>Site-wide links on thousands of pages.</li>
              <li>Networks of near-identical sites (PBN-like behavior).</li>
            </ul>
          </div>
        </div>

        <p className="mt-4 text-xs text-white/60">
          In the <span className="font-semibold text-white">Pro plan</span>, you
          can see the individual toxic score per link, plus AI notes like “very
          likely paid guest post” or “comment spam across multiple blogs.”
        </p>
      </section>

      {/* 3. AI EXPLANATION + ACTION PLAN */}
      <section className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-4 w-4 text-fuchsia-300" />
            <h2 className="font-semibold text-lg">AI explanation of your risk</h2>
          </div>

          <p className="text-sm text-white/70 mb-3">
            Based on the current sample of{" "}
            <span className="font-semibold">{totalBacklinks} backlinks</span>,
            Lustmia estimates:
          </p>

          <ul className="text-sm text-white/80 space-y-1 list-disc list-inside mb-3">
            <li>
              Around{" "}
              <span className="font-semibold">
                {toxicPercent}% of links look potentially toxic
              </span>
              .
            </li>
            <li>
              At least{" "}
              <span className="font-semibold">
                {highRiskDomains} domains
              </span>{" "}
              are high-risk and should be reviewed first.
            </li>
            <li>
              Current risk level:{" "}
              <span className="font-semibold text-amber-200">
                “Monitor & clean”
              </span>{" "}
              — not an emergency, but worth scheduling cleanup.
            </li>
          </ul>

          <p className="text-xs text-white/60">
            As you run more scans, this panel will reflect{" "}
            <span className="font-semibold text-white">
              real data from your profile
            </span>{" "}
            instead of demo numbers.
          </p>
        </div>

        <div className="rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-300" />
            <h2 className="font-semibold text-lg">What you should do next</h2>
          </div>

          <ol className="list-decimal list-inside text-sm text-white/80 space-y-1 mb-3">
            <li>
              <span className="font-semibold">Review high-risk domains</span> in
              the Backlink Explorer and tag links you don’t recognize.
            </li>
            <li>
              <span className="font-semibold">Try to remove links at source</span>{" "}
              (contact webmasters or remove old profiles you control).
            </li>
            <li>
              <span className="font-semibold">Use Google’s disavow tool</span>{" "}
              only for clearly manipulative, non-removable links.
            </li>
            <li>
              <span className="font-semibold">Balance with strong links</span>{" "}
              by shipping high-quality content and PR campaigns.
            </li>
          </ol>

          <p className="text-xs text-white/60 mb-2">
            Lustmia doesn’t automatically disavow anything — you stay in
            control. We surface the worst offenders and help you document{" "}
            <span className="font-semibold text-white">
              why each link is risky
            </span>{" "}
            so your cleanup looks natural.
          </p>

          {/* PRO FEATURE CALLOUT / TOGGLE */}
          <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-400/30 text-xs text-emerald-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex flex-col gap-1 sm:max-w-[60%]">
              <div className="flex items-start gap-2">
                <ShieldCheck className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>
                  Monthly{" "}
                  <span className="font-semibold">toxicity sweeps</span> re-scan
                  your backlink profile on a schedule and highlight new risky
                  links before they become a ranking problem.
                </span>
              </div>

              {isInternal && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] opacity-80">
                    Domain to monitor:
                  </span>
                  <input
                    type="text"
                    value={sweepDomain}
                    onChange={(e) => setSweepDomain(e.target.value)}
                    onBlur={() =>
                      saveSweepSettings(sweepsEnabled, sweepDomain)
                    }
                    placeholder="yourdomain.com"
                    className="bg-black/40 border border-emerald-400/40 rounded-md px-2 py-1 text-[11px] text-emerald-50 outline-none focus:border-emerald-200"
                  />
                </div>
              )}
            </div>

            {hydrated && (
              <div className="flex flex-col items-end gap-1 sm:self-end">
                {isInternal ? (
                  <>
                    <span className="text-[11px] opacity-80">
                      Internal / Agency preview
                    </span>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={async () => {
                        const next = !sweepsEnabled;
                        setSweepsEnabled(next);
                        await saveSweepSettings(next, sweepDomain);
                      }}
                      className={clsx(
                        "text-[11px] px-3 py-1 rounded-full border transition",
                        sweepsEnabled
                          ? "bg-emerald-500/20 border-emerald-300 text-emerald-50"
                          : "bg-white/5 border-white/20 text-white/70 hover:bg-white/10",
                      )}
                    >
                      {saving
                        ? "Saving…"
                        : sweepsEnabled
                        ? "Sweeps ON"
                        : "Turn sweeps on"}
                    </button>
                  </>
                ) : (
                  <span className="text-[11px] opacity-80">
                    Available on <span className="font-semibold">Agency</span>{" "}
                    ($129/mo). Upgrade to enable automatic monthly checks.
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. PREVENTION BEST PRACTICES */}
      <section className="rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="h-4 w-4 text-emerald-300" />
          <h2 className="font-semibold text-lg">How to avoid toxic links</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4 text-sm text-white/80">
          <div className="rounded-xl bg-white/5 border border-white/10 p-3">
            <p className="font-semibold mb-1">Build, don’t buy</p>
            <ul className="list-disc list-inside text-xs text-white/70 space-y-1">
              <li>Avoid cheap “1,000 backlinks for $9” type offers.</li>
              <li>Prioritize PR, partnerships and real communities.</li>
              <li>
                If you outsource link building, demand transparent site lists.
              </li>
            </ul>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-3">
            <p className="font-semibold mb-1">Watch your anchors</p>
            <ul className="list-disc list-inside text-xs text-white/70 space-y-1">
              <li>Mix branded, URL and descriptive anchors.</li>
              <li>Limit exact-match “money” keywords.</li>
              <li>Keep anchors readable for humans, not just bots.</li>
            </ul>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-3">
            <p className="font-semibold mb-1">Monitor regularly</p>
            <ul className="list-disc list-inside text-xs text-white/70 space-y-1">
              <li>Set a monthly reminder to review new backlinks.</li>
              <li>
                Use Lustmia alerts (Pro) to catch sudden spam attacks early.
              </li>
              <li>
                Document what you remove / disavow for future reference.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}
