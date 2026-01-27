"use client";

import { useEffect, useRef, useState } from "react";

type ChatMsg = {
  role: "user" | "assistant";
  content: string;
};

type Props = {
  /** Optional extra context you want to send to the AI
   *  e.g. Lighthouse summary or “Top opportunities” text */
  siteContext?: string;
};

export default function FixCoachWidget({ siteContext }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [plan, setPlan] = useState<string | null>(null);

  // Stable session id so anonymous users can still be rate-limited
  const sessionIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = "fix_coach_session_id";
    let id = window.localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(key, id);
    }
    sessionIdRef.current = id;
  }, []);

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    const q = input.trim();
    if (!q || loading) return;

    setError(null);
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setInput("");

    try {
      const res = await fetch("/api/ai/fix-coach/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          siteContext: siteContext ?? null,
          sessionId: sessionIdRef.current ?? null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data?.error || "AI coach had a problem answering.");
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply as string },
      ]);

      if (typeof data.remainingMessages === "number") {
        setRemaining(data.remainingMessages);
      }
      if (data.plan) setPlan(data.plan);
    } catch (err: any) {
      setError(err?.message || "Network error talking to AI coach.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating button bottom-right */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-40 rounded-full bg-fuchsia-600 text-white px-4 py-3 shadow-lg text-sm font-semibold hover:bg-fuchsia-500"
      >
        {open ? "Close AI coach" : "Ask AI how to fix this"}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 right-6 z-40 w-full max-w-md rounded-2xl bg-black/90 border border-white/10 shadow-2xl backdrop-blur p-4 flex flex-col gap-3 text-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">AI Fix Coach</div>
              <div className="text-[11px] text-white/60">
                Ask how to fix your Lighthouse / metrics issues.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-white/60 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>

          <div className="h-52 overflow-y-auto space-y-2 border border-white/10 rounded-xl p-2 bg-black/40">
            {messages.length === 0 && (
              <div className="text-[12px] text-white/60">
                Example: <br />
                <span className="italic">
                  &quot;How do I reduce unused JavaScript on this site?&quot;
                </span>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "text-right"
                    : "text-left"
                }
              >
                <div
                  className={
                    "inline-block px-2 py-1 rounded-lg max-w-[90%] " +
                    (m.role === "user"
                      ? "bg-fuchsia-600 text-white"
                      : "bg-white/5 text-white/90")
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="text-[11px] text-red-300">{error}</div>
          )}

          {remaining != null && !plan?.includes("admin") && (
            <div className="text-[11px] text-white/50">
              Messages left this period: <b>{remaining}</b>
            </div>
          )}

          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask how to fix a specific issue…"
              className="flex-1 rounded-xl bg-black/60 border border-white/15 px-3 py-2 text-sm outline-none placeholder:text-white/35 focus:border-fuchsia-400"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-3 py-2 rounded-xl bg-fuchsia-600 text-white text-sm font-semibold disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
