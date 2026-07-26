"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabaseBrowserClient.auth.getUser().then(({ data, error: userError }) => {
      setReady(Boolean(data.user));
      if (userError || !data.user) {
        setError(
          "This password setup link is invalid or has expired. Request a new one from the sign-in page.",
        );
      }
      setChecking(false);
    });
  }, []);

  async function updatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    setLoading(true);
    const { error: updateError } =
      await supabaseBrowserClient.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setUpdated(true);
    setLoading(false);
  }

  return (
    <AuthShell
      eyebrow="Secure your account"
      title={updated ? "Password updated" : "Choose a new password"}
      description={
        updated
          ? "Your Rankcore account now uses your new password."
          : "Set a password for your email address. You will use it for future sign-ins."
      }
      footer={
        <p className="text-center text-sm text-black/50">
          Need a fresh setup link?{" "}
          <Link
            href="/login"
            className="font-semibold text-black underline decoration-black/20 underline-offset-4 hover:decoration-black"
          >
            Return to sign in
          </Link>
        </p>
      }
    >
      {checking ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-black/35" />
        </div>
      ) : updated ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <CheckCircle2 className="h-7 w-7 text-emerald-700" />
          <p className="mt-4 text-sm font-semibold text-emerald-950">
            You are ready to continue.
          </p>
          <button
            type="button"
            onClick={() => {
              router.replace("/dashboard");
              router.refresh();
            }}
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-black px-5 text-sm font-semibold text-white"
          >
            Open dashboard
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <form onSubmit={updatePassword} className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">
              New password
            </span>
            <span className="relative block">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                disabled={!ready}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 w-full rounded-xl border border-black/15 bg-white px-4 pr-12 text-sm text-black outline-none transition placeholder:text-black/30 focus:border-black focus:ring-4 focus:ring-black/[0.05] disabled:bg-black/[0.03]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                disabled={!ready}
                className="absolute inset-y-0 right-0 grid w-12 place-items-center text-black/35 transition hover:text-black disabled:opacity-30"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold">
              Confirm password
            </span>
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              disabled={!ready}
              autoComplete="new-password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="h-12 w-full rounded-xl border border-black/15 bg-white px-4 text-sm text-black outline-none transition placeholder:text-black/30 focus:border-black focus:ring-4 focus:ring-black/[0.05] disabled:bg-black/[0.03]"
            />
          </label>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!ready || loading}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-black px-5 text-sm font-semibold text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating…
              </>
            ) : (
              <>
                Save new password
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
