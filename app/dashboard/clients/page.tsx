"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Plus, Globe2, FileText, Trash2, Edit3, Download } from "lucide-react";
import clsx from "clsx";

type Client = {
  id: string;
  name: string;
  domain: string;
  plan: "Free" | "Personal" | "Business" | "Agency";
  cadence: "None" | "Weekly PDF" | "Monthly PDF" | "Monthly PDF + CSV";
  notes?: string;
};

const STORAGE_KEY = "lustmia_clients_v1";

const defaultClients: Client[] = [
  {
    id: "demo-1",
    name: "Demo client",
    domain: "demo-client.com",
    plan: "Business",
    cadence: "Monthly PDF + CSV",
    notes: "Example client workspace for testing.",
  },
];

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [plan, setPlan] = useState<Client["plan"]>("Business");
  const [cadence, setCadence] =
    useState<Client["cadence"]>("Monthly PDF + CSV");
  const [notes, setNotes] = useState("");

  // load from localStorage once
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Client[];
        if (Array.isArray(parsed) && parsed.length) {
          setClients(parsed);
          setLoading(false);
          return;
        }
      }
      setClients(defaultClients);
    } catch {
      setClients(defaultClients);
    } finally {
      setLoading(false);
    }
  }, []);

  // persist whenever clients change
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
    } catch {
      // ignore
    }
  }, [clients]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setDomain("");
    setPlan("Business");
    setCadence("Monthly PDF + CSV");
    setNotes("");
  }

  function openNewClient() {
    resetForm();
    setShowForm(true);
  }

  function openEdit(client: Client) {
    setEditingId(client.id);
    setName(client.name);
    setDomain(client.domain);
    setPlan(client.plan);
    setCadence(client.cadence);
    setNotes(client.notes || "");
    setShowForm(true);
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !domain.trim()) return;

    const trimmedDomain = domain.trim().replace(/^https?:\/\//, "");

    if (editingId) {
      setClients((prev) =>
        prev.map((c) =>
          c.id === editingId
            ? {
                ...c,
                name: name.trim(),
                domain: trimmedDomain,
                plan,
                cadence,
                notes: notes.trim() || undefined,
              }
            : c
        )
      );
    } else {
      const id = `client-${crypto.randomUUID()}`;
      setClients((prev) => [
        ...prev,
        {
          id,
          name: name.trim(),
          domain: trimmedDomain,
          plan,
          cadence,
          notes: notes.trim() || undefined,
        },
      ]);
    }

    setShowForm(false);
    resetForm();
  }

  function removeClient(id: string) {
    if (!confirm("Remove this client? This only affects your view in Lustmia.")) {
      return;
    }
    setClients((prev) => prev.filter((c) => c.id !== id));
  }

  // --- CSV EXPORT ---
  function exportCsv() {
    if (!clients.length) {
      alert("No clients to export yet.");
      return;
    }

    const rows: (string | number)[][] = [
      ["Client", "Domain", "Plan", "Reports", "Notes"],
      ...clients.map((c) => [
        c.name,
        c.domain,
        c.plan,
        c.cadence,
        c.notes ?? "",
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((field) =>
            `"${String(field).replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "lustmia-clients.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardLayout active="clients">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Clients
          </h1>
          <p className="text-white/60 text-sm">
            Manage client workspaces, reports and access.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-xs md:text-sm hover:bg-white/10"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>

          <button
            onClick={openNewClient}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            New client
          </button>
        </div>
      </header>

      {/* Info strip */}
      <section className="rounded-2xl p-4 bg-black/40 border border-white/10 backdrop-blur-xl mb-4 text-xs text-white/70">
            In the Agency plan, each client gets their own workspace, reporting
            schedule, and login. Use this list to keep track of client accounts,
            domains, and reporting cadence.
      </section>


      {/* Clients table */}
      <section className="rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl mb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-white/60">
              <tr className="border-b border-white/10">
                <th className="text-left py-2">Client</th>
                <th className="text-left py-2">Primary domain</th>
                <th className="text-left py-2">Plan</th>
                <th className="text-left py-2">Reports</th>
                <th className="text-left py-2 w-20 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-6 text-center text-white/50 text-sm"
                  >
                    Loading clients…
                  </td>
                </tr>
              )}

              {!loading && clients.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-6 text-center text-white/50 text-sm"
                  >
                    No clients yet. Click “New client” to add your first one.
                  </td>
                </tr>
              )}

              {!loading &&
                clients.map((client) => (
                  <tr
                    key={client.id}
                    className="border-b border-white/5 hover:bg-white/[0.03]"
                  >
                    <td className="py-2">
                      <div className="font-medium">{client.name}</div>
                      {client.notes && (
                        <div className="text-xs text-white/50">
                          {client.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-2 text-white/80">
                      <div className="inline-flex items-center gap-1">
                        <Globe2 className="h-3 w-3 text-white/40" />
                        <span>{client.domain}</span>
                      </div>
                    </td>
                    <td className="py-2">{client.plan}</td>
                    <td className="py-2 text-white/80">
                      <div className="inline-flex items-center gap-1">
                        <FileText className="h-3 w-3 text-white/40" />
                        <span>{client.cadence}</span>
                      </div>
                    </td>
                    <td className="py-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(client)}
                          className="p-1.5 rounded-lg bg-white/5 border border-white/15 hover:bg-white/10"
                          aria-label="Edit client"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => removeClient(client.id)}
                          className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/30 hover:bg-red-500/20"
                          aria-label="Remove client"
                        >
                          <Trash2 className="h-3 w-3 text-red-200" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Slide-over / inline form */}
      {showForm && (
        <section className="rounded-2xl p-5 bg-black/60 border border-white/15 backdrop-blur-xl mb-6">
          <h2 className="text-lg font-semibold mb-2">
            {editingId ? "Edit client" : "New client"}
          </h2>
          <p className="text-xs text-white/60 mb-4">
            Add basic details for each client so you can organize monitoring,
            reporting, and notes in one place.
          </p>


          <form
            onSubmit={onSave}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div className="space-y-1">
              <label className="text-xs text-white/60">Client name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#05030b] border border-white/10 text-sm outline-none focus:ring-2 focus:ring-pink-500"
                placeholder="Acme Shoes"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-white/60">Primary domain</label>
              <input
                type="text"
                required
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#05030b] border border-white/10 text-sm outline-none focus:ring-2 focus:ring-pink-500"
                placeholder="acme.com"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-white/60">Plan</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value as Client["plan"])}
                className="w-full px-3 py-2 rounded-lg bg-[#05030b] border border-white/10 text-sm outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="Free">Free</option>
                <option value="Personal">Personal</option>
                <option value="Business">Business</option>
                <option value="Agency">Agency</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-white/60">
                Reporting cadence
              </label>
              <select
                value={cadence}
                onChange={(e) =>
                  setCadence(e.target.value as Client["cadence"])
                }
                className="w-full px-3 py-2 rounded-lg bg-[#05030b] border border-white/10 text-sm outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="None">None</option>
                <option value="Weekly PDF">Weekly PDF</option>
                <option value="Monthly PDF">Monthly PDF</option>
                <option value="Monthly PDF + CSV">Monthly PDF + CSV</option>
              </select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs text-white/60">
                Notes (niche, priority, etc.)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-[#05030b] border border-white/10 text-sm outline-none focus:ring-2 focus:ring-pink-500"
                placeholder="Fashion e-commerce · UK market · priority outreach."
              />
            </div>

            <div className="md:col-span-2 flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/15 text-sm hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={clsx(
                  "px-4 py-2 rounded-xl text-sm font-semibold",
                  "bg-pink-600 hover:bg-pink-500"
                )}
              >
                {editingId ? "Save changes" : "Add client"}
              </button>
            </div>
          </form>
        </section>
      )}
    </DashboardLayout>
  );
}
