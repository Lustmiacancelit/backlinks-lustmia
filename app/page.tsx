import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  CircleAlert,
  CircleCheck,
  Eye,
  FileText,
  Globe2,
  Link2,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

const capabilities = [
  {
    icon: Radar,
    eyebrow: "Always watching",
    title: "Backlink monitoring",
    description:
      "Track new, lost, and recovered links without rebuilding the same report every week.",
  },
  {
    icon: ShieldCheck,
    eyebrow: "Risk, explained",
    title: "Toxic link detection",
    description:
      "Surface suspicious domains, link patterns, and sudden changes before they become ranking problems.",
  },
  {
    icon: Users,
    eyebrow: "See the gap",
    title: "Competitor intelligence",
    description:
      "Find the referring domains your competitors have earned—and the strongest opportunities you have not.",
  },
  {
    icon: Target,
    eyebrow: "Work the right list",
    title: "Opportunity scoring",
    description:
      "Prioritize outreach using authority, relevance, traffic potential, and your likelihood of winning the link.",
  },
  {
    icon: FileText,
    eyebrow: "Ready to share",
    title: "Clear client reports",
    description:
      "Turn complex link data into focused, branded summaries your team and clients can act on.",
  },
  {
    icon: Sparkles,
    eyebrow: "Ask the data",
    title: "AI backlink analyst",
    description:
      "Get plain-English answers about ranking movement, link risk, and the next best action.",
  },
];

const questions = [
  "Which new links are actually helping us rank?",
  "Did we lose anything important this week?",
  "Where are competitors earning links we should pursue?",
  "Which suspicious domains deserve action first?",
];

export default function HomePage() {
  return (
    <main className="overflow-hidden bg-white text-black">
      <section className="relative border-b border-black/10">
        <div className="marketing-grid absolute inset-0 opacity-70" />
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-white via-white/90 to-transparent" />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16 lg:pb-28 lg:pt-28">
          <div className="max-w-2xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              AI-powered backlink intelligence
            </div>

            <h1 className="text-balance text-[clamp(3rem,6vw,5.6rem)] font-semibold leading-[0.96] tracking-[-0.065em]">
              Every backlink.
              <br />
              Every risk.
              <br />
              <span className="text-black/35">One clear move.</span>
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-8 text-black/60 sm:text-xl">
              Rankcore turns a noisy backlink profile into a focused growth
              plan—what changed, what matters, and exactly what to do next.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register?free=1"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-6 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-black/80"
              >
                Start a free scan
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-black/15 bg-white px-6 py-3.5 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:border-black/35"
              >
                View sample analysis
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-black/45">
              {["No credit card", "Fast setup", "Actionable from day one"].map(
                (item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-black" />
                    {item}
                  </span>
                ),
              )}
            </div>
          </div>

          <ProductPreview />
        </div>
      </section>

      <section className="border-b border-black/10 bg-[#fafafa]">
        <div className="mx-auto grid max-w-7xl divide-y divide-black/10 px-5 sm:grid-cols-2 sm:divide-x sm:divide-y-0 sm:px-8 lg:grid-cols-4">
          {[
            ["01", "Monitor new and lost links"],
            ["02", "Spot harmful link patterns"],
            ["03", "Benchmark real competitors"],
            ["04", "Prioritize the next win"],
          ].map(([number, label]) => (
            <div key={number} className="flex items-start gap-4 py-7 sm:px-6">
              <span className="font-mono text-xs font-semibold text-black/30">
                {number}
              </span>
              <span className="text-sm font-semibold tracking-[-0.01em]">
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section id="platform" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32">
        <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/40">
              One backlink command center
            </p>
            <h2 className="mt-5 max-w-xl text-4xl font-semibold leading-[1.03] tracking-[-0.05em] sm:text-5xl">
              From link data to ranking decisions.
            </h2>
            <p className="mt-6 max-w-md text-base leading-7 text-black/55">
              Built for SEO teams that need trustworthy answers, not another
              wall of metrics.
            </p>
          </div>

          <div className="grid gap-px overflow-hidden rounded-2xl border border-black/10 bg-black/10 sm:grid-cols-2">
            {capabilities.map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="group bg-white p-7 transition hover:bg-[#fafafa] sm:p-8"
                >
                  <div className="flex items-start justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-black text-white">
                      <Icon className="h-5 w-5" />
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-black/20 transition group-hover:text-black" />
                  </div>
                  <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/35">
                    {feature.eyebrow}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold tracking-[-0.025em]">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-black/55">
                    {feature.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-black text-white">
        <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32">
          <div className="grid gap-16 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
                Built for action
              </p>
              <h2 className="mt-5 text-4xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-5xl">
                See it.
                <br />
                Understand it.
                <br />
                Improve it.
              </h2>
            </div>

            <div className="grid gap-8 sm:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Connect",
                  text: "Add your domain and establish the backlink baseline.",
                },
                {
                  step: "02",
                  title: "Analyze",
                  text: "Rankcore scores change, risk, authority, and opportunity.",
                },
                {
                  step: "03",
                  title: "Act",
                  text: "Work a prioritized plan with clear reasoning behind it.",
                },
              ].map((item) => (
                <div key={item.step} className="border-t border-white/20 pt-5">
                  <span className="font-mono text-xs text-white/35">
                    {item.step}
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/50">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="soft-noise border-b border-black/10">
        <div className="mx-auto grid max-w-7xl gap-16 px-5 py-24 sm:px-8 lg:grid-cols-2 lg:items-center lg:py-32">
          <div className="rounded-3xl border border-black/10 bg-white p-4 shadow-[0_28px_80px_rgba(0,0,0,0.10)] sm:p-6">
            <div className="rounded-2xl bg-[#f5f5f3] p-5 sm:p-8">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">
                  Ask Rankcore
                </p>
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold shadow-sm">
                  Live context
                </span>
              </div>
              <div className="mt-8 space-y-3">
                {questions.map((question, index) => (
                  <div
                    key={question}
                    className={`flex items-center justify-between rounded-xl border px-4 py-4 text-sm font-medium ${
                      index === 0
                        ? "border-black bg-black text-white"
                        : "border-black/10 bg-white text-black"
                    }`}
                  >
                    <span>{question}</span>
                    <ArrowRight
                      className={`h-4 w-4 ${
                        index === 0 ? "text-white/50" : "text-black/25"
                      }`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/40">
              Answers, not exports
            </p>
            <h2 className="mt-5 text-4xl font-semibold leading-[1.04] tracking-[-0.05em] sm:text-5xl">
              Your link profile is talking. Rankcore translates.
            </h2>
            <p className="mt-6 text-base leading-7 text-black/55">
              Move from “what happened?” to “what should we do?” without
              stitching together crawlers, spreadsheets, and generic AI tools.
            </p>
            <Link
              href="/about"
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold underline decoration-black/20 underline-offset-4 transition hover:decoration-black"
            >
              Why we built Rankcore
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#f3f3f0]">
          <div className="marketing-grid grid gap-10 px-6 py-14 sm:px-12 lg:grid-cols-[1fr_auto] lg:items-center lg:px-16 lg:py-16">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/40">
                Start with one domain
              </p>
              <h2 className="mt-4 max-w-2xl text-4xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-5xl">
                Make your backlink profile your advantage.
              </h2>
            </div>
            <Link
              href="/register?free=1"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-6 py-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-black/80"
            >
              Start your free scan
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-black/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-10 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <BrandMark showTagline={false} />
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-black/45">
            <Link href="/privacy" className="transition hover:text-black">
              Privacy
            </Link>
            <Link href="/terms" className="transition hover:text-black">
              Terms
            </Link>
            <Link href="/support" className="transition hover:text-black">
              Support
            </Link>
            <span>© {new Date().getFullYear()} Rankcore.ai</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

function ProductPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 rounded-[2.5rem] bg-black/[0.035] blur-2xl" />
      <div className="relative overflow-hidden rounded-[1.65rem] border border-black/10 bg-white p-2 shadow-[0_30px_100px_rgba(0,0,0,0.18)]">
        <div className="overflow-hidden rounded-[1.25rem] bg-[#0b0b0b] text-white">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
            </div>
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/35">
              rankcore.ai / overview
            </span>
            <Eye className="h-3.5 w-3.5 text-white/35" />
          </div>

          <div className="grid min-h-[490px] sm:grid-cols-[148px_1fr]">
            <aside className="hidden border-r border-white/10 p-4 sm:block">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-white text-black">
                  <Link2 className="h-3.5 w-3.5" />
                </span>
                <span className="text-xs font-semibold">Rankcore</span>
              </div>
              <div className="mt-7 space-y-1.5">
                {[
                  ["Overview", BarChart3],
                  ["Backlinks", Link2],
                  ["Competitors", Users],
                  ["Link risk", ShieldCheck],
                  ["Opportunities", Search],
                ].map(([label, Icon], index) => {
                  const MenuIcon = Icon as typeof BarChart3;
                  return (
                    <div
                      key={label as string}
                      className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[10px] ${
                        index === 0
                          ? "bg-white text-black"
                          : "text-white/40"
                      }`}
                    >
                      <MenuIcon className="h-3 w-3" />
                      {label as string}
                    </div>
                  );
                })}
              </div>
            </aside>

            <div className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.16em] text-white/35">
                    Demo workspace
                  </p>
                  <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em]">
                    backlinkbrief.com
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-semibold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  Monitoring
                </span>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                {[
                  ["Authority", "72", "+4.8%", TrendingUp],
                  ["Ref. domains", "386", "+18", Globe2],
                  ["Risk score", "Low", "3 flagged", ShieldCheck],
                ].map(([label, value, delta, Icon]) => {
                  const StatIcon = Icon as typeof TrendingUp;
                  return (
                    <div
                      key={label as string}
                      className="rounded-xl border border-white/10 bg-white/[0.045] p-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-[8px] uppercase tracking-[0.12em] text-white/30">
                          {label as string}
                        </p>
                        <StatIcon className="h-3 w-3 text-white/30" />
                      </div>
                      <p className="mt-2 text-xl font-semibold tracking-[-0.04em]">
                        {value as string}
                      </p>
                      <p className="mt-1 text-[9px] text-emerald-300">
                        {delta as string}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.045] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-medium text-white/45">
                      Authority movement
                    </p>
                    <p className="mt-1 text-xs font-semibold">
                      Healthy growth over 90 days
                    </p>
                  </div>
                  <span className="rounded-md bg-white/10 px-2 py-1 text-[8px] text-white/45">
                    90 days
                  </span>
                </div>
                <svg
                  viewBox="0 0 520 120"
                  className="mt-3 h-28 w-full"
                  role="img"
                  aria-label="Authority growth chart"
                >
                  <defs>
                    <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {[24, 54, 84, 114].map((y) => (
                    <line
                      key={y}
                      x1="0"
                      x2="520"
                      y1={y}
                      y2={y}
                      stroke="rgba(255,255,255,0.08)"
                    />
                  ))}
                  <path
                    d="M0 99 C45 93, 70 101, 108 82 S168 78, 210 65 S273 70, 315 48 S382 54, 421 33 S479 31, 520 14 L520 120 L0 120 Z"
                    fill="url(#chartFill)"
                  />
                  <path
                    d="M0 99 C45 93, 70 101, 108 82 S168 78, 210 65 S273 70, 315 48 S382 54, 421 33 S479 31, 520 14"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.045] p-3.5">
                  <div className="flex items-center gap-2">
                    <CircleCheck className="h-3.5 w-3.5 text-emerald-300" />
                    <p className="text-[10px] font-semibold">Strongest gain</p>
                  </div>
                  <p className="mt-3 truncate text-[10px] text-white/55">
                    editorialweekly.com/resources
                  </p>
                  <p className="mt-1 text-[9px] text-white/30">
                    Authority 81 · Editorial
                  </p>
                </div>
                <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.06] p-3.5">
                  <div className="flex items-center gap-2">
                    <CircleAlert className="h-3.5 w-3.5 text-amber-300" />
                    <p className="text-[10px] font-semibold">Needs review</p>
                  </div>
                  <p className="mt-3 text-[10px] text-white/55">
                    3 unusual domains detected
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1 text-[9px] text-amber-300">
                    Review risk pattern
                    <ArrowRight className="h-2.5 w-2.5" />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-5 -left-5 hidden items-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 shadow-xl sm:flex">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-black text-white">
          <TrendingDown className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[10px] font-semibold">Lost-link alert resolved</p>
          <p className="mt-0.5 text-[9px] text-black/40">
            High-value backlink recovered
          </p>
        </div>
      </div>
    </div>
  );
}
