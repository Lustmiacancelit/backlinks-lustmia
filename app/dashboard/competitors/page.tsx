"use client";

import DashboardLayout from "@/components/DashboardLayout";

export default function CompetitorsPage() {
  return (
    <DashboardLayout>
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Competitors
          </h1>
          <p className="text-white/60 text-sm">
            Track backlink gaps and authority vs your main competitors.
          </p>
        </div>
      </header>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
          <h2 className="font-semibold mb-2">Competitor List</h2>
          <p className="text-xs text-white/60 mb-2">
            (Later: add, remove, and crawl competitors.)
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2 border border-white/10">
              <span>competitor1.com</span>
              <span className="text-xs text-white/60">DA 45 · 1.2k links</span>
            </li>
            <li className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2 border border-white/10">
              <span>competitor2.io</span>
              <span className="text-xs text-white/60">DA 38 · 900 links</span>
            </li>
          </ul>
        </div>

        <div className="rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
          <h2 className="font-semibold mb-2">Quick insights</h2>
          <ul className="text-sm text-white/70 list-disc list-inside space-y-1">
            <li>You’re winning on referring domains vs competitor1.com</li>
            <li>competitor2.io has more EDU backlinks.</li>
            <li>Pro plan will show exact gap opportunities.</li>
          </ul>
        </div>
      </section>
    </DashboardLayout>
  );
}
