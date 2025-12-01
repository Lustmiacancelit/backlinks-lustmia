"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { ArrowRight, Link2, Sparkles } from "lucide-react";

function RegisterInner() {
  const router = useRouter();
  const params = useSearchParams();
  const isFree = params.get("free") === "1";
  const emailFromQuery = params.get("email") || "";

  const supabase = supabaseBrowserClient;

  const [email, setEmail] = useState(emailFromQuery);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔁 If user is already logged in, skip register screen and go to dashboard
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        router.replace("/dashboard");
      }
    });
  }, [router, supabase]);

  // keep input in sync with ?email= if present
  useEffect(() => {
    if (emailFromQuery) {
      setEmail(emailFromQuery);
      try {
        localStorage.setItem("lead_email", emailFromQuery);
      } catch {}
    }
  }, [emailFromQuery]);

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // store for pricing page suggestions
    try {
      localStorage.setItem("lead_email", email);
    } catch {}

    // for free users we drop them into dashboard after auth callback,
    // for paid users we send them to pricing to choose a plan
    const redirectTo = isFree
      ? `${window.location.origin}/auth/callback?next=/dashboard`
      : `${window.location.origin}/pricing`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSent(true);
  }

  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden flex items-center justify-center p-6">
      {/* background glows */}
      <div className="absolute w-[520px] h-[520px] bg-fuchsia-600/30 blur-3xl rounded-full -top-40 -left-40" />
      <div className="absolute w-[560px] h-[560px] bg-indigo-600/20 blur-3xl rounded-full top-0 -right-52" />

      <div className="relative w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-6 md:p-7 backdrop-blur">
        <div className="flex items-center gap-2 font-semibold">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
            <Link2 className="w-5 h-5 text-fuchsia-300" />
          </div>
          <span className="text-lg">Lustmia Backlinks</span>
        </div>

        <div className="mt-6 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/80">
            <Sparkles className="w-3.5 h-3.5 text-fuchsia-300" />
            {isFree ? "Create your free account" : "Create your account"}
          </div>

          <h1 className="text-2xl font-bold">
            {isFree ? "Start with the free plan" : "Sign up to continue"}
          </h1>
          <p className="text-white/70 text-sm">
            We&apos;ll email you a magic link to confirm your account. No
            password needed.
          </p>
        </div>

        <div className="mt-5">
          {sent ? (
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-400/30 p-4 text-sm text-emerald-200">
              Check your inbox and click the magic link to finish setting up
              your account.
            </div>
          ) : (
            <form onSubmit={onRegister} className="space-y-3">
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 outline-none placeholder:text-white/35"
              />

              {error && <div className="text-red-300 text-sm">{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {loading ? "Sending magic link…" : "Send magic link"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>

        <div className="mt-6 border-t border-white/10 pt-4 flex flex-col gap-2">
          <button
            onClick={() => router.push("/login")}
            className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm"
          >
            Already have an account? Sign in
          </button>
          <button
            onClick={() => router.push("/")}
            className="w-full py-2.5 rounded-xl text-white/70 hover:text-white text-sm"
          >
            Back to home
          </button>
        </div>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-white/60 text-sm">Loading registration…</div>
        </main>
      }
    >
      <RegisterInner />
    </Suspense>
  );
}
