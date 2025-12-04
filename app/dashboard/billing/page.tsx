"use client";

import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";
import {
  CreditCard,
  CalendarClock,
  Receipt,
  ArrowUpRight,
} from "lucide-react";

type BillingSummary = {
  planName: string;
  planBadge: "Free" | "Pro" | "Agency";
  status: "active" | "trialing" | "canceled";
  nextRenewalDate: string | null;
  nextPaymentAmount: string | null;
  mrr: string;
  totalSpent: string;
  currency: string;
};

type Invoice = {
  id: string;
  date: string;
  amount: string;
  status: "paid" | "open" | "void";
  downloadUrl?: string;
};

// NOTE: demo values – once Stripe is wired up you can replace these with
// data returned from your billing API / Stripe webhooks.
const demoBilling: BillingSummary = {
  planName: "Free (demo)",
  planBadge: "Free",
  status: "active",
  nextRenewalDate: null,
  nextPaymentAmount: null,
  mrr: "$0 / mo",
  totalSpent: "$0.00",
  currency: "USD",
};

const demoInvoices: Invoice[] = [
  {
    id: "INV-0001",
    date: "—",
    amount: "$0.00",
    status: "paid",
  },
];

export default function BillingPage() {
  const billing = demoBilling;
  const invoices = demoInvoices;

  return (
    <DashboardLayout active="billing">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Billing
          </h1>
          <p className="text-white/60 text-sm">
            Manage your Lustmia subscription, spending, and invoices.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/pricing"
            className="px-4 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-sm font-semibold flex items-center gap-1"
          >
            Change plan
            <ArrowUpRight className="h-4 w-4" />
          </Link>
          {/* When you add a Stripe customer-portal route, point this there */}
          {/* <Link
            href="/api/stripe/portal"
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-white/10"
          >
            Manage billing
          </Link> */}
        </div>
      </header>

      {/* TOP KPIs */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <BillingStatCard
          icon={<CreditCard className="h-5 w-5 text-fuchsia-300" />}
          label="Current MRR"
          value={billing.mrr}
          helper={
            billing.planBadge === "Free"
              ? "Upgrade to start a paid subscription."
              : "Estimated monthly recurring revenue from this subscription."
          }
        />
        <BillingStatCard
          icon={<Receipt className="h-5 w-5 text-emerald-300" />}
          label="Total spent"
          value={billing.totalSpent}
          helper="Total invoiced on this account across all cycles."
        />
        <BillingStatCard
          icon={<CalendarClock className="h-5 w-5 text-cyan-300" />}
          label={
            billing.planBadge === "Free" ? "Next charge" : "Next renewal date"
          }
          value={
            billing.nextRenewalDate && billing.nextPaymentAmount
              ? `${billing.nextRenewalDate} · ${billing.nextPaymentAmount}`
              : "No upcoming charges"
          }
          helper={
            billing.planBadge === "Free"
              ? "You won’t be charged until you choose a paid plan."
              : "We’ll attempt payment on this date for the next period."
          }
        />
      </section>

      {/* PLAN + INVOICES */}
      <section className="grid md:grid-cols-2 gap-4 mb-6">
        {/* Current plan */}
        <div className="rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
          <h2 className="font-semibold mb-3">Current plan</h2>

          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm text-white/70 mb-0.5">Plan</div>
              <div className="text-lg font-semibold">{billing.planName}</div>
            </div>
            <span className="px-2 py-1 rounded-lg text-xs bg-white/5 border border-white/15 text-white/70">
              {billing.status === "active" ? "Active" : billing.status}
            </span>
          </div>

          <ul className="text-sm text-white/70 space-y-1 mb-4 list-disc list-inside">
            <li>Backlink scans with AI-powered summaries.</li>
            <li>Toxic link detection and competitor insights.</li>
            <li>Client workspaces and exportable reports.</li>
          </ul>

          <p className="text-xs text-white/50">
            Need a custom agency plan or annual billing?{" "}
            <Link
              href="mailto:sales@lustmia.com"
              className="text-fuchsia-300 hover:text-fuchsia-200 underline"
            >
              Talk to sales
            </Link>
            .
          </p>
        </div>

        {/* Invoices */}
        <div className="rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
          <h2 className="font-semibold mb-3">Invoices</h2>
          <p className="text-xs text-white/60 mb-3">
            When you subscribe via Stripe, paid invoices will appear here with
            downloadable PDFs for your records.
          </p>

          <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5">
            <table className="w-full text-sm">
              <thead className="text-white/60">
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-3">Date</th>
                  <th className="text-left py-2 px-3">Invoice</th>
                  <th className="text-left py-2 px-3">Amount</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-left py-2 px-3">Download</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-4 px-3 text-xs text-white/60 text-center"
                    >
                      No invoices yet. Your first invoice will appear here after
                      you upgrade to a paid plan.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-t border-white/5 hover:bg-white/5/50"
                    >
                      <td className="py-2 px-3 text-xs text-white/75">
                        {inv.date}
                      </td>
                      <td className="py-2 px-3 text-xs font-mono">
                        {inv.id}
                      </td>
                      <td className="py-2 px-3 text-xs text-white/75">
                        {inv.amount}
                      </td>
                      <td className="py-2 px-3 text-xs">
                        <span
                          className={
                            inv.status === "paid"
                              ? "px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-200 border border-emerald-400/25"
                              : inv.status === "open"
                              ? "px-2 py-1 rounded-lg bg-amber-500/15 text-amber-200 border border-amber-400/25"
                              : "px-2 py-1 rounded-lg bg-white/5 text-white/60 border border-white/15"
                          }
                        >
                          {inv.status === "paid"
                            ? "Paid"
                            : inv.status === "open"
                            ? "Open"
                            : "Void"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-xs">
                        {inv.downloadUrl ? (
                          <Link
                            href={inv.downloadUrl}
                            className="text-fuchsia-300 hover:text-fuchsia-200 underline"
                            target="_blank"
                          >
                            PDF
                          </Link>
                        ) : (
                          <span className="text-white/40">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-[11px] text-white/50">
            For billing questions or VAT / tax ID updates, contact{" "}
            <Link
              href="mailto:billing@lustmia.com"
              className="text-fuchsia-300 hover:text-fuchsia-200 underline"
            >
              billing@lustmia.com
            </Link>
            .
          </p>
        </div>
      </section>
    </DashboardLayout>
  );
}

function BillingStatCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl p-4 bg-black/40 border border-white/10 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 rounded-xl bg-white/5 border border-white/10">
          {icon}
        </div>
      </div>
      <div className="text-xs text-white/60 mb-1">{label}</div>
      <div className="text-xl font-semibold mb-1">{value}</div>
      <p className="text-[11px] text-white/50">{helper}</p>
    </div>
  );
}
