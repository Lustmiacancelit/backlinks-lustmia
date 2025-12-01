"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import type { ReactNode } from "react";

type DashboardLayoutProps = {
  children: ReactNode;
  /** optional manual override, e.g. "overview", "billing", etc. */
  active?: string;
};

const navItems = [
  { href: "/dashboard", key: "overview", label: "Overview" },
  {
    href: "/dashboard/backlink-explorer",
    key: "backlink-explorer",
    label: "Backlink Explorer",
  },
  { href: "/dashboard/clients", key: "clients", label: "Clients" },
  { href: "/dashboard/competitors", key: "competitors", label: "Competitors" },
  { href: "/dashboard/toxic-links", key: "toxic-links", label: "Toxic Links" },
  { href: "/dashboard/billing", key: "billing", label: "Billing" },
  { href: "/dashboard/settings", key: "settings", label: "Settings" },
];

export default function DashboardLayout({
  children,
  active,
}: DashboardLayoutProps) {
  const pathname = usePathname();

  // derive an active key from pathname if not explicitly passed
  const derivedActive =
    active ||
    (navItems.find((item) => pathname?.startsWith(item.href))?.key ??
      "overview");

  return (
    <div className="min-h-screen bg-[#05030b] text-white flex">
      {/* SIDEBAR */}
      <aside className="hidden md:flex md:flex-col w-64 border-r border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="px-5 py-4 border-b border-white/10">
          <div className="text-xs uppercase tracking-[0.2em] text-white/40">
            LustMia
          </div>
          <div className="font-semibold text-lg mt-1">Backlink Studio</div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={clsx(
                "flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors border",
                derivedActive === item.key
                  ? "bg-white/10 border-white/30"
                  : "bg-transparent border-transparent text-white/70 hover:bg-white/5 hover:border-white/20"
              )}
            >
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-white/10 text-xs text-white/50">
          Demo workspace · Free plan
        </div>
      </aside>

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP BAR */}
        <header className="sticky top-0 z-20 border-b border-white/10 bg-black/60 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            {/* Mobile brand / nav toggle placeholder */}
            <div className="md:hidden">
              <div className="text-xs uppercase tracking-[0.2em] text-white/40">
                LustMia
              </div>
              <div className="font-semibold text-base">Backlink Studio</div>
            </div>

            <div className="hidden md:block text-xs text-white/60">
              {derivedActive === "overview" && "Overview of your backlinks."}
              {derivedActive === "backlink-explorer" &&
                "Inspect individual backlinks & anchors."}
              {derivedActive === "clients" &&
                "Manage agency / client workspaces."}
              {derivedActive === "competitors" &&
                "Compare your authority with competitors."}
              {derivedActive === "toxic-links" &&
                "Find and handle spammy / risky links."}
              {derivedActive === "billing" &&
                "Plan, invoices and subscription."}
              {derivedActive === "settings" &&
                "Workspace and account preferences."}
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-xs text-white/60">
                Plan: <span className="uppercase">Free</span>
              </span>
              {/* This is your "Upgrade" button that leads to Stripe pricing page */}
              <Link
                href="/pricing"
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500 text-xs font-semibold hover:opacity-90"
              >
                Upgrade to Pro
              </Link>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="max-w-6xl mx-auto w-full px-4 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
