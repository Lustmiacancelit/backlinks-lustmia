"use client";

import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";

export default function BillingPage() {
  return (
    <DashboardLayout active="billing">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Billing
          </h1>
          <p className="text-white/60 text-sm">
            Manage your Lustmia subscription and invoices.
          </p>
        </div>
        <Link
          href="/pricing"
          className="px-4 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-sm font-semibold"
        >
          Change plan
        </Link>
      </header>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
          <h2 className="font-semibold mb-2">Current plan</h2>
          <p className="text-sm text-white/70">
            Plan: <b>Free</b> (demo).  
            Upgrading will unlock Pro scans, history, exports and more.
          </p>
        </div>

        <div className="rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
          <h2 className="font-semibold mb-2">Invoices</h2>
          <p className="text-sm text-white/70">
            When you subscribe via Stripe, paid invoices will appear here with
            downloadable links.
          </p>
        </div>
      </section>
    </DashboardLayout>
  );
}
