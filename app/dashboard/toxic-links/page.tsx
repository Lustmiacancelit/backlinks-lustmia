"use client";

export default function ToxicLinksPage() {
  return (
    <>
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Toxic Links
          </h1>
          <p className="text-white/60 text-sm">
            Review and prioritize potentially harmful backlinks to disavow or remove.
          </p>
        </div>
      </header>

      <section className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
          <div className="text-xs text-white/60 mb-1">Estimated toxic links</div>
          <div className="text-3xl font-bold">42</div>
          <div className="text-xs text-emerald-300 mt-1">
            -8 vs last week (demo data)
          </div>
        </div>

        <div className="rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
          <div className="text-xs text-white/60 mb-1">Domains flagged</div>
          <div className="text-3xl font-bold">18</div>
          <div className="text-xs text-white/60 mt-1">
            Includes spammy directories & PBNs.
          </div>
        </div>

        <div className="rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
          <div className="text-xs text-white/60 mb-1">Disavow status</div>
          <div className="text-sm text-white/80">
            (Later:) export Google Disavow file directly from here.
          </div>
        </div>
      </section>

      <section className="rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Toxic backlinks (demo)</h2>
          <p className="text-xs text-white/60">
            In Pro, this table will be powered by real toxicity scores.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-white/60">
              <tr className="border-b border-white/10">
                <th className="text-left py-2">Referring URL</th>
                <th className="text-left py-2">Domain</th>
                <th className="text-left py-2">Spam score</th>
                <th className="text-left py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/5">
                <td className="py-2 break-all">
                  spam-directory.example.com/listings/lustmia
                </td>
                <td className="py-2">spam-directory.example.com</td>
                <td className="py-2 text-red-300 font-semibold">High</td>
                <td className="py-2">
                  <span className="px-2 py-1 rounded-lg text-xs bg-red-500/15 text-red-200 border border-red-400/30">
                    Mark for disavow
                  </span>
                </td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 break-all">
                  cheap-links.example.net/buy-backlinks
                </td>
                <td className="py-2">cheap-links.example.net</td>
                <td className="py-2 text-amber-300 font-semibold">Medium</td>
                <td className="py-2">
                  <span className="px-2 py-1 rounded-lg text-xs bg-white/5 text-white border border-white/20">
                    Review later
                  </span>
                </td>
              </tr>
              {/* Later: replace with real data */}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
