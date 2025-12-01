"use client";

import DashboardLayout from "@/components/DashboardLayout";

export default function BacklinkExplorerPage() {
  return (
    <DashboardLayout active="backlink-explorer">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Backlink Explorer
          </h1>
          <p className="text-white/60 text-sm">
            Inspect individual backlinks, anchors, and landing pages.
          </p>
        </div>
      </header>

      <section className="rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl mb-4">
        <p className="text-sm text-white/70 mb-3">
          (Later we can wire this to a real table/search. For now, this is a
          placeholder list.)
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-white/60">
              <tr className="border-b border-white/10">
                <th className="text-left py-2">Source URL</th>
                <th className="text-left py-2">Anchor</th>
                <th className="text-left py-2">Target</th>
                <th className="text-left py-2">Type</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/5">
                <td className="py-2">blog.example.com/seo-guide</td>
                <td className="py-2 text-white/70">
                  lustmia backlinks checker
                </td>
                <td className="py-2">lustmia.com</td>
                <td className="py-2 text-white/70">Editorial</td>
                <td className="py-2">
                  <span className="px-2 py-1 rounded-lg text-xs bg-emerald-500/15 text-emerald-200 border border-emerald-400/20">
                    Active
                  </span>
                </td>
              </tr>
              {/* add more rows or hook up real data later */}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardLayout>
  );
}
