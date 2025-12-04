"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import {
  Bell,
  Globe2,
  Mail,
  Trash2,
  LogOut,
  User,
  CalendarClock,
  AlertTriangle,
} from "lucide-react";
import clsx from "clsx";

type NotificationPrefs = {
  weeklyPositionReport: boolean;
  toxicLinkAlerts: boolean;
  newBacklinkDigest: boolean;
  billingEmails: boolean;
};

type WorkspaceSettings = {
  primaryDomain: string;
  timezone: string;
  language: string;
};

export default function SettingsPage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  const [workspace, setWorkspace] = useState<WorkspaceSettings>({
    primaryDomain: "lustmia.com",
    timezone: "America/New_York",
    language: "en",
  });

  const [notifications, setNotifications] = useState<NotificationPrefs>({
    weeklyPositionReport: true,
    toxicLinkAlerts: true,
    newBacklinkDigest: true,
    billingEmails: true,
  });

  const [savingWorkspace, setSavingWorkspace] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [workspaceSaved, setWorkspaceSaved] = useState(false);
  const [notificationsSaved, setNotificationsSaved] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  // Load basic account info from Supabase
  useEffect(() => {
    supabaseBrowserClient.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) return;

      const user = data.user;
      const meta: any = user.user_metadata || {};
      const email = user.email || null;

      const first =
        meta.first_name ||
        meta.firstName ||
        meta.given_name ||
        (meta.full_name ? String(meta.full_name).split(" ")[0] : "");
      const last =
        meta.last_name ||
        meta.lastName ||
        meta.family_name ||
        (meta.full_name
          ? String(meta.full_name).split(" ").slice(1).join(" ")
          : "");

      const name = `${first || ""} ${last || ""}`.trim() || email;

      setEmail(email);
      setDisplayName(name);
    });
  }, []);

  function updateWorkspace<K extends keyof WorkspaceSettings>(
    key: K,
    value: WorkspaceSettings[K],
  ) {
    setWorkspace((prev) => ({ ...prev, [key]: value }));
    setWorkspaceSaved(false);
  }

  function toggleNotification<K extends keyof NotificationPrefs>(key: K) {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
    setNotificationsSaved(false);
  }

  async function handleSaveWorkspace() {
    setSavingWorkspace(true);
    setWorkspaceSaved(false);

    try {
      // TODO: POST to /api/settings/workspace
      await new Promise((resolve) => setTimeout(resolve, 600));
      setWorkspaceSaved(true);
    } finally {
      setSavingWorkspace(false);
    }
  }

  async function handleSaveNotifications() {
    setSavingNotifications(true);
    setNotificationsSaved(false);

    try {
      // TODO: POST to /api/settings/notifications
      await new Promise((resolve) => setTimeout(resolve, 600));
      setNotificationsSaved(true);
    } finally {
      setSavingNotifications(false);
    }
  }

  async function handleLogout() {
    setLogoutLoading(true);
    try {
      await supabaseBrowserClient.auth.signOut();
      router.push("/");
    } finally {
      setLogoutLoading(false);
    }
  }

  function handleDeleteAccount() {
    const ok = window.confirm(
      "This will request deletion of your account and associated backlink data. Are you sure?",
    );
    if (!ok) return;

    // TODO: call /api/account/delete
    alert(
      "Account deletion is not wired yet in this demo. In production this button will trigger a secure deletion flow.",
    );
  }

  return (
    <DashboardLayout active="settings">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Settings
          </h1>
          <p className="text-white/60 text-sm">
            Workspace, notifications and account preferences.
          </p>
        </div>

        <button
          onClick={handleLogout}
          disabled={logoutLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-white/5 border border-white/15 hover:bg-white/10 disabled:opacity-60"
        >
          <LogOut className="w-4 h-4" />
          {logoutLoading ? "Signing out..." : "Log out"}
        </button>
      </header>

      <section className="space-y-5">
        {/* ACCOUNT CARD */}
        <div className="rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-fuchsia-300" />
                <h2 className="font-semibold">Account information</h2>
              </div>
              <p className="text-xs text-white/60 mt-1">
                Manage your login details and identify which email receives
                reports.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div className="text-xs text-white/50">Name</div>
              <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                {displayName || "—"}
              </div>
              <p className="text-[11px] text-white/45">
                We pull this from your login provider. In a future update
                you&apos;ll be able to edit it here.
              </p>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-white/50">Email address</div>
              <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-2">
                <span>{email || "Not signed in"}</span>
              </div>
              <p className="text-[11px] text-white/45">
                All position reports, toxic link alerts and billing emails are
                sent to this address.
              </p>
            </div>
          </div>
        </div>

        {/* WORKSPACE SETTINGS */}
        <div className="rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-cyan-300" />
                <h2 className="font-semibold">Workspace</h2>
              </div>
              <p className="text-xs text-white/60 mt-1">
                Default domain, time zone and language used across reports.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-1 md:col-span-1">
              <label className="text-xs text-white/60">Primary domain</label>
              <input
                type="text"
                value={workspace.primaryDomain}
                onChange={(e) =>
                  updateWorkspace("primaryDomain", e.target.value)
                }
                className="w-full px-3 py-2 rounded-xl bg-[#05030b] border border-white/15 outline-none text-sm focus:border-fuchsia-400"
                placeholder="yourdomain.com"
              />
              <p className="text-[11px] text-white/45">
                This is the domain Lustmia will use as the default project in
                dashboards and reports.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-white/60">Time zone</label>
              <select
                value={workspace.timezone}
                onChange={(e) => updateWorkspace("timezone", e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#05030b] border border-white/15 outline-none text-sm focus:border-fuchsia-400"
              >
                <option value="America/New_York">US Eastern (EST/EDT)</option>
                <option value="America/Los_Angeles">US Pacific (PST/PDT)</option>
                <option value="Europe/London">Europe – London</option>
                <option value="Europe/Berlin">Europe – Berlin</option>
                <option value="America/Sao_Paulo">Brazil – São Paulo</option>
                <option value="UTC">UTC</option>
              </select>
              <p className="text-[11px] text-white/45">
                Used to schedule when emails are sent and how dates appear in
                reports.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-white/60">Language</label>
              <select
                value={workspace.language}
                onChange={(e) => updateWorkspace("language", e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#05030b] border border-white/15 outline-none text-sm focus:border-fuchsia-400"
              >
                <option value="en">English</option>
                <option value="pt-BR">Português (Brasil)</option>
                <option value="es">Español</option>
              </select>
              <p className="text-[11px] text-white/45">
                AI summaries and email content will use this language where
                available.
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleSaveWorkspace}
              disabled={savingWorkspace}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/15 text-sm hover:bg-white/10 disabled:opacity-60"
            >
              {savingWorkspace ? "Saving…" : "Save workspace"}
            </button>
            {workspaceSaved && (
              <span className="text-xs text-emerald-300">
                Workspace settings saved.
              </span>
            )}
          </div>
        </div>

        {/* NOTIFICATION SETTINGS */}
        <div className="rounded-2xl p-5 bg-black/40 border border-white/10 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-300" />
                <h2 className="font-semibold">Email notifications</h2>
              </div>
              <p className="text-xs text-white/60 mt-1">
                Control how often Lustmia emails you about rankings and toxic
                links.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-white/45">
              <Mail className="w-3 h-3" />
              <span>All alerts go to {email || "your account email"}.</span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <NotificationRow
              title="Weekly position tracking report"
              description="Once a week, get a Semrush-style email with visibility, traffic, top keywords and landing pages."
              checked={notifications.weeklyPositionReport}
              onToggle={() => toggleNotification("weeklyPositionReport")}
            />

            <NotificationRow
              title="Toxic link alerts"
              description="When Lustmia detects a spike in risky or spammy backlinks, send me an alert with the domains to review."
              checked={notifications.toxicLinkAlerts}
              onToggle={() => toggleNotification("toxicLinkAlerts")}
            />

            <NotificationRow
              title="New backlink digest"
              description="Short digest when meaningful new referring domains appear — not every tiny link, only the important ones."
              checked={notifications.newBacklinkDigest}
              onToggle={() => toggleNotification("newBacklinkDigest")}
            />

            <NotificationRow
              title="Billing & invoices"
              description="Subscription receipts, failed payment warnings, and renewal reminders."
              checked={notifications.billingEmails}
              onToggle={() => toggleNotification("billingEmails")}
            />
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleSaveNotifications}
              disabled={savingNotifications}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/15 text-sm hover:bg-white/10 disabled:opacity-60 inline-flex items-center gap-2"
            >
              <CalendarClock className="w-4 h-4" />
              {savingNotifications ? "Saving…" : "Save notification settings"}
            </button>
            {notificationsSaved && (
              <span className="text-xs text-emerald-300">
                Notification preferences saved.
              </span>
            )}
          </div>

          <p className="mt-3 text-[11px] text-white/45 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-300" />
            You can opt out at any time — every email includes a one-click
            unsubscribe link for that alert type.
          </p>
        </div>

        {/* DANGER ZONE */}
        <div className="rounded-2xl p-5 bg-red-950/30 border border-red-700/40">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-300" />
                <h2 className="font-semibold text-red-100">Danger zone</h2>
              </div>
              <p className="text-xs text-red-100/80 mt-1">
                Permanently remove your workspace and backlink data from
                Lustmia.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-red-100/90">
            <div className="max-w-xl">
              Deleting your account will queue all associated backlink scans,
              reports and AI insights for deletion. This can&apos;t be undone.
            </div>
            <button
              type="button"
              onClick={handleDeleteAccount}
              className={clsx(
                "px-4 py-2 rounded-xl border text-sm font-semibold",
                "bg-red-700/60 hover:bg-red-700 border-red-400/70",
              )}
            >
              Delete account & data
            </button>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}

/** Small toggle row used in the notifications card */
function NotificationRow(props: {
  title: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}) {
  const { title, description, checked, onToggle } = props;
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
      <button
        type="button"
        onClick={onToggle}
        className={clsx(
          "mt-1 w-10 h-6 rounded-full flex items-center px-0.5 transition-colors",
          checked ? "bg-fuchsia-500/80" : "bg-white/15",
        )}
        aria-pressed={checked}
      >
        <span
          className={clsx(
            "w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform",
            checked ? "translate-x-4" : "translate-x-0",
          )}
        />
      </button>
      <div>
        <div className="font-medium text-sm">{title}</div>
        <p className="text-xs text-white/65 mt-0.5">{description}</p>
      </div>
    </div>
  );
}
