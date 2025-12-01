"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { ArrowRight, Link2, Sparkles } from "lucide-react";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const supabase = supabaseBrowserClient;

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔁 If user is already logged in, skip login screen and go to dashboard (or ?next=)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        router.replace(next || "/dashboard");
      }
    });
  }, [router, supabase, next]);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      next
    )}`;

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
            Secure login
          </div>

          <h1 className="text-2xl font-bold">Log in to your dashboard</h1>
          <p className="text-white/70 text-sm">
            We’ll send you a one-tap magic link. No password needed.
          </p>
        </div>

        <div className="mt-5">
          {sent ? (
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-400/30 p-4 text-sm text-emerald-200">
              Magic link sent. Check your inbox and click it to continue.
            </div>
          ) : (
            <form onSubmit={onLogin} className="space-y-3">
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
                {loading ? "Sending…" : "Send magic link"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>

        <div className="mt-6 border-t border-white/10 pt-4 flex flex-col gap-2">
          <button
            onClick={() => router.push("/register")}
            className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm"
          >
            Create account
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-white/60 text-sm">Loading login…</div>
        </main>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
