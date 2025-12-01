"use client";

import DashboardLayout from "@/components/DashboardLayout";

export default function ToxicLinksPage() {
  return (
    <DashboardLayout>
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Toxic Links
          </h1>
          <p className="text-white/60 text-sm">
            Identify spammy backlinks and prepare disavow files.
          </p>
        </div>
      </header>

      <section className="rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl mb-4">
        <h2 className="font-semibold mb-2">Overview</h2>
        <p className="text-sm text-white/70 mb-3">
          In Pro, this section will score every backlink, cluster spam patterns,
          and export ready-to-upload disavow lists.
        </p>

        <div className="grid md:grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl bg-white/5 border border-white/10 p-3">
            <div className="text-xs text-white/60">Suspected spam domains</div>
            <div className="text-2xl font-bold mt-1">0</div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-3">
            <div className="text-xs text-white/60">Auto-disavow candidates</div>
            <div className="text-2xl font-bold mt-1">0</div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-3">
            <div className="text-xs text-white/60">Manual review needed</div>
            <div className="text-2xl font-bold mt-1">0</div>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}
