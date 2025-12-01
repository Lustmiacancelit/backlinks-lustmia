"use client";

export default function SettingsPage() {
  return (
    <>
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Settings
          </h1>
          <p className="text-white/60 text-sm">
            Workspace, notifications and account preferences.
          </p>
        </div>
      </header>

      <section className="space-y-4">
        <div className="rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
          <h2 className="font-semibold mb-2">Workspace</h2>
          <p className="text-sm text-white/70">
            (Later:) default domain, time zone, and language.
          </p>
        </div>

        <div className="rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
          <h2 className="font-semibold mb-2">Email notifications</h2>
          <p className="text-sm text-white/70">
            (Later:) weekly reports, alert thresholds, and billing emails.
          </p>
        </div>
      </section>
    </>
  );
}
