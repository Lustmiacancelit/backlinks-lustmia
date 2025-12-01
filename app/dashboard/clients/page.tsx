"use client";

import DashboardLayout from "@/components/DashboardLayout";

export default function ClientsPage() {
  return (
    <DashboardLayout active="clients">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Clients
          </h1>
          <p className="text-white/60 text-sm">
            Manage client workspaces, reports and access.
          </p>
        </div>
        <button className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-white/10">
          + New client
        </button>
      </header>

      <section className="rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
        <p className="text-sm text-white/70 mb-3">
          In the Agency plan, each client gets their own workspace, reporting
          schedule, and login.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-white/60">
              <tr className="border-b border-white/10">
                <th className="text-left py-2">Client</th>
                <th className="text-left py-2">Primary domain</th>
                <th className="text-left py-2">Plan</th>
                <th className="text-left py-2">Reports</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/5">
                <td className="py-2 font-medium">Demo client</td>
                <td className="py-2">demo-client.com</td>
                <td className="py-2 text-white/70">Business</td>
                <td className="py-2 text-white/70">Monthly PDF + CSV</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </DashboardLayout>
  );
}
