"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

function RegisterInner() {
  const router = useRouter();
  const params = useSearchParams();
  const isFree = params.get("free") === "1";
  const emailFromQuery = params.get("email") || "";
  const next = isFree ? "/dashboard" : "/pricing";

  const [email, setEmail] = useState(emailFromQuery);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabaseBrowserClient.auth.getUser().then(({ data }) => {
      if (data.user) router.replace("/dashboard");
    });
  }, [router]);

  useEffect(() => {
    if (!emailFromQuery) return;
    setEmail(emailFromQuery);
    try {
      localStorage.setItem("lead_email", emailFromQuery);
    } catch {
      // Local storage is optional.
    }
  }, [emailFromQuery]);

  async function onRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }
    if (!accepted) {
      setError("Accept the Terms and Privacy Policy to continue.");
      return;
    }

    setLoading(true);

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      next,
    )}`;
    const {
      data,
      error: signUpError,
    } = await supabaseBrowserClient.auth.signUp({
      email: trimmedEmail,
      password,
      options: { emailRedirectTo: redirectTo },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    try {
      localStorage.setItem("lead_email", trimmedEmail);
    } catch {
      // Registration has already succeeded.
    }

    if (data.session) {
      router.replace(next);
      router.refresh();
      return;
    }

    setRegistered(true);
    setLoading(false);
  }

  return (
    <AuthShell
      eyebrow={isFree ? "Start free" : "Create your account"}
      title={registered ? "Confirm your email" : "Create your workspace"}
      description={
        registered
          ? `We sent a confirmation email to ${email.trim()}. Confirm it to activate your Rankcore account.`
          : "Create a secure email-and-password account. Your first backlink workspace only takes a few minutes to set up."
      }
      footer={
        <p className="text-center text-sm text-black/50">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-black underline decoration-black/20 underline-offset-4 hover:decoration-black"
          >
            Sign in
          </Link>
        </p>
      }
    >
      {registered ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <CheckCircle2 className="h-7 w-7 text-emerald-700" />
          <p className="mt-4 text-sm font-semibold text-emerald-950">
            Your account is almost ready.
          </p>
          <p className="mt-2 text-sm leading-6 text-emerald-900/70">
            Open the confirmation email, then return here to sign in with the
            password you just created.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-950"
          >
            Go to sign in
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <form onSubmit={onRegister} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">
              Work email
            </span>
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
            <span className="mb-2 block text-sm font-semibold">Password</span>
            <span className="relative block">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="At least 8 characters"
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

          <label className="block">
            <span className="mb-2 block text-sm font-semibold">
              Confirm password
            </span>
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="h-12 w-full rounded-xl border border-black/15 bg-white px-4 text-sm text-black outline-none transition placeholder:text-black/30 focus:border-black focus:ring-4 focus:ring-black/[0.05]"
            />
          </label>

          <label className="flex cursor-pointer items-start gap-3 pt-1 text-xs leading-5 text-black/50">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-black/20 accent-black"
            />
            <span>
              I agree to the{" "}
              <Link
                href="/terms"
                className="font-semibold text-black underline decoration-black/20 underline-offset-2"
              >
                Terms
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="font-semibold text-black underline decoration-black/20 underline-offset-2"
              >
                Privacy Policy
              </Link>
              .
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

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-black px-5 text-sm font-semibold text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating account…
              </>
            ) : (
              <>
                Create account
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-[calc(100vh-72px)] place-items-center bg-[#f4f4f1]">
          <Loader2 className="h-5 w-5 animate-spin text-black/35" />
        </main>
      }
    >
      <RegisterInner />
    </Suspense>
  );
}
