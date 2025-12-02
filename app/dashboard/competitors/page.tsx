"use client";

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Plus,
  Trash2,
  ExternalLink,
  TrendingUp,
  ShieldAlert,
} from "lucide-react";

type Competitor = {
  domain: string;
  authority: number;
  refs: number;
  velocity: number; // new links / week
  toxic: number; // %
  anchor: string;
  trend: number[]; // sparkline bars
};

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([
    {
      domain: "demo-competitor.com",
      authority: 42,
      refs: 320,
      velocity: 18,
      toxic: 11,
      anchor: "Branded",
      trend: [10, 16, 14, 22, 28, 24, 31],
    },
    {
      domain: "fashion-competitor.io",
      authority: 36,
      refs: 210,
      velocity: 9,
      toxic: 23,
      anchor: "Money",
      trend: [6, 9, 11, 13, 17, 18, 21],
    },
  ]);

  const [newDomain, setNewDomain] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  function addCompetitor() {
    const cleaned = newDomain.trim().toLowerCase();
    if (!cleaned) return;

    setCompetitors((prev) => [
      ...prev,
      {
        domain: cleaned,
        // temporary randomised metrics – later wired to real crawl
        authority: Math.floor(Math.random() * 30) + 25,
        refs: Math.floor(Math.random() * 800) + 150,
        velocity: Math.floor(Math.random() * 30) + 5,
        toxic: Math.floor(Math.random() * 35),
        anchor: ["Branded", "Money", "Generic"][Math.floor(Math.random() * 3)],
        trend: Array.from({ length: 7 }, () =>
          Math.floor(Math.random() * 35) + 5
        ),
      },
    ]);

    setNewDomain("");
    setModalOpen(false);
  }

  function removeCompetitor(domain: string) {
    setCompetitors((prev) => prev.filter((c) => c.domain !== domain));
  }

  const strongest =
    competitors.length > 0
      ? competitors.reduce((best, c) =>
          c.authority > best.authority ? c : best
        )
      : null;

  return (
    <DashboardLayout active="competitors">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Competitors
          </h1>
          <p className="text-white/60 text-sm">
            Track backlink authority, link velocity and risk vs your main
            competitors.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500 text-sm font-semibold hover:opacity-90 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add competitor
        </button>
      </header>

      {/* MAIN GRID */}
      <section className="grid lg:grid-cols-3 gap-4 mb-6">
        {/* TABLE */}
        <div className="lg:col-span-2 rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
          <h2 className="font-semibold mb-2">Competitor comparison</h2>
          <p className="text-xs text-white/60 mb-3">
            Later this can read from Supabase + crawler. For now this is a
            local list so you can design the experience and pricing model.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-white/60 border-b border-white/10">
                <tr>
                  <th className="text-left py-2">Domain</th>
                  <th className="text-left py-2">Authority</th>
                  <th className="text-left py-2">Ref domains</th>
                  <th className="text-left py-2">Velocity</th>
                  <th className="text-left py-2">Toxic %</th>
                  <th className="text-left py-2">Anchor type</th>
                  <th className="text-left py-2">Trend</th>
                  <th className="text-left py-2">Actions</th>
                </tr>
              </thead>

              <tbody>
                {competitors.map((c) => {
                  let toxColor =
                    c.toxic > 20
                      ? "text-red-300"
                      : c.toxic > 10
                      ? "text-amber-300"
                      : "text-emerald-300";

                  return (
                    <tr
                      key={c.domain}
                      className="border-b border-white/5 last:border-0"
                    >
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <span>{c.domain}</span>
                          <a
                            href={`https://${c.domain}`}
                            target="_blank"
                            className="text-white/40 hover:text-white"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </td>

                      <td className="py-2">{c.authority}</td>
                      <td className="py-2">{c.refs}</td>

                      <td className="py-2 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-cyan-300" />
                        {c.velocity}/wk
                      </td>

                      <td className="py-2 flex items-center gap-1">
                        <ShieldAlert className={`h-3 w-3 ${toxColor}`} />
                        {c.toxic}%
                      </td>

                      <td className="py-2 capitalize">{c.anchor}</td>

                      <td className="py-2">
                        <div className="flex gap-1 items-end h-8">
                          {c.trend.map((n, i) => (
                            <div
                              key={i}
                              className="w-1.5 bg-pink-500/50 rounded"
                              style={{ height: `${Math.max(4, n / 2)}px` }}
                            />
                          ))}
                        </div>
                      </td>

                      <td className="py-2">
                        <button
                          onClick={() => removeCompetitor(c.domain)}
                          className="p-1 rounded bg-red-500/20 border border-red-500/40 hover:bg-red-500/30"
                        >
                          <Trash2 className="h-3 w-3 text-red-200" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {competitors.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-8 text-center text-white/50"
                    >
                      No competitors added yet. Click “Add competitor” to start.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI-STYLE SUMMARY */}
        <div className="rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
          <h2 className="font-semibold mb-2">AI competitive snapshot</h2>

          {strongest ? (
            <div className="space-y-2 text-sm text-white/70">
              <p>
                <strong>{strongest.domain}</strong> currently has the highest
                estimated authority at <strong>{strongest.authority}</strong>{" "}
                and <strong>{strongest.refs}</strong> referring domains.
              </p>
              <p>
                Their link velocity is{" "}
                <strong>{strongest.velocity} new links / week</strong>, with a
                toxic ratio of <strong>{strongest.toxic}%</strong>.{" "}
                {strongest.toxic > 20
                  ? "That suggests aggressive, riskier link building."
                  : "This looks relatively clean compared to typical spam patterns."}
              </p>
              <p>
                Focus on earning links that their profile is missing (e.g.{" "}
                <strong>
                  more {strongest.anchor.toLowerCase()} / editorial placements
                </strong>
                ) to create a defensible advantage.
              </p>
            </div>
          ) : (
            <p className="text-sm text-white/60">
              Add at least one competitor to generate a comparison summary.
            </p>
          )}
        </div>
      </section>

      {/* ADD COMPETITOR MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-full max-w-md rounded-2xl bg-black/90 border border-white/10 p-6">
            <h3 className="text-lg font-semibold mb-3">Add competitor</h3>
            <p className="text-xs text-white/60 mb-3">
              Enter a domain you care about. Later this can trigger a Pro scan
              per competitor.
            </p>

            <input
              type="text"
              className="w-full px-4 py-3 rounded-xl bg-[#0A0B11] border border-white/10 focus:outline-none focus:ring-2 focus:ring-pink-500 mb-4"
              placeholder="competitor.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="px-3 py-2 text-sm rounded-xl bg-white/10 hover:bg-white/15"
              >
                Cancel
              </button>
              <button
                onClick={addCompetitor}
                className="px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500 font-semibold hover:opacity-90"
              >
                Save competitor
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
