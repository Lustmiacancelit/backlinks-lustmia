"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const callbackError = params.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(callbackError);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("lead_email");
      if (saved) setEmail(saved);
    } catch {
      // Local storage may be unavailable in privacy-focused browsers.
    }

    supabaseBrowserClient.auth.getUser().then(({ data }) => {
      if (data.user) router.replace(next);
    });
  }, [next, router]);

  async function onLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Enter your email address and password.");
      return;
    }

    setLoading(true);

    try {
      const { error: signInError } =
        await supabaseBrowserClient.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      try {
        localStorage.setItem("lead_email", trimmedEmail);
      } catch {
        // The login itself has already succeeded.
      }

      router.replace(next);
      router.refresh();
    } catch {
      setError("We could not sign you in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function sendPasswordReset() {
    setError(null);
    setMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Enter your email address first.");
      return;
    }

    setResetting(true);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      "/update-password",
    )}`;

    const { error: resetError } =
      await supabaseBrowserClient.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo,
      });

    if (resetError) {
      setError(resetError.message);
    } else {
      setMessage(
        "Password setup link sent. Check your inbox to choose a password.",
      );
    }
    setResetting(false);
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to Rankcore"
      description="Use your email address and password to open your backlink workspace."
      footer={
        <p className="text-center text-sm text-black/50">
          New to Rankcore?{" "}
          <Link
            href="/register?free=1"
            className="font-semibold text-black underline decoration-black/20 underline-offset-4 hover:decoration-black"
          >
            Create a free account
          </Link>
        </p>
      }
    >
      <form onSubmit={onLogin} className="space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Email address</span>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-12 w-full rounded-xl border border-black/15 bg-white px-4 text-sm text-black outline-none transition placeholder:text-black/30 focus:border-black focus:ring-4 focus:ring-black/[0.05]"
          />
        </label>

        <label className="block">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">Password</span>
            <button
              type="button"
              onClick={sendPasswordReset}
              disabled={resetting}
              className="text-xs font-semibold text-black/45 transition hover:text-black disabled:opacity-50"
            >
              {resetting ? "Sending…" : "Forgot or never set one?"}
            </button>
          </div>
          <span className="relative block">
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 w-full rounded-xl border border-black/15 bg-white px-4 pr-12 text-sm text-black outline-none transition placeholder:text-black/30 focus:border-black focus:ring-4 focus:ring-black/[0.05]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 right-0 grid w-12 place-items-center text-black/35 transition hover:text-black"
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

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
          >
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-5 text-emerald-800">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-black px-5 text-sm font-semibold text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-[calc(100vh-72px)] place-items-center bg-[#f4f4f1]">
          <Loader2 className="h-5 w-5 animate-spin text-black/35" />
        </main>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
