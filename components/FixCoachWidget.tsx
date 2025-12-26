"use client";

import { useState } from "react";
import { MessageCircle, Send } from "lucide-react";

type CoachReply = {
  ok: boolean;
  reply?: string;
  remainingMessages?: number;
  plan?: string;
  isAdmin?: boolean;
  error?: string;
};

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
};

function createSessionId() {
  if (typeof window === "undefined") return "fix-coach-ssr";
  const key = "rankcore_fixcoach_session";
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(key, id);
  }
  return id;
}

export default function FixCoachWidget({
  siteContext,
}: {
  siteContext?: string;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I’m your Fix Coach. Ask me how to improve this site’s performance, core vitals, or how to fix a specific audit.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  async function sendMessage() {
    const q = input.trim();
    if (!q || loading) return;

    setError(null);
    setLoading(true);

    const sessionId = createSessionId();

    const newUserMessage: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: q,
    };
    setMessages((prev) => [...prev, newUserMessage]);
    setInput("");

    try {
      const res = await fetch("/api/ai/fix-coach/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          siteContext: siteContext ?? null,
          sessionId,
        }),
      });

      const data: CoachReply = await res.json();

      if (!res.ok || !data.ok) {
        // credit limit / auth error, etc.
        const msg =
          data.error ||
          "I couldn’t answer that right now. Please try again or upgrade your plan.";
        setError(msg);
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: "assistant",
            content: msg,
          },
        ]);
        return;
      }

      if (typeof data.remainingMessages === "number") {
        setRemaining(data.remainingMessages);
      }
      if (typeof data.plan === "string") {
        setPlan(data.plan);
      }
      if (typeof data.isAdmin === "boolean") {
        setIsAdmin(data.isAdmin);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: data.reply || "I generated an empty reply.",
        },
      ]);
    } catch (err: any) {
      console.error("[FixCoachWidget] error", err);
      const msg =
        err?.message ||
        "Unexpected error talking to Fix Coach. Please try again.";
      setError(msg);
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: "assistant", content: msg },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  return (
    <>
      {/* FAB button – adjust placement as you like */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-4 py-2 shadow-xl"
      >
        <MessageCircle className="h-4 w-4" />
        <span className="text-sm font-semibold">Ask Fix Coach</span>
      </button>

      {open && (
        <div className="fixed bottom-20 right-6 z-40 w-full max-w-md rounded-2xl bg-[#050509] border border-white/10 shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div>
              <div className="text-sm font-semibold">Fix Coach (AI)</div>
              <div className="text-[11px] text-white/60">
                {isAdmin
                  ? "Admin · unlimited messages"
                  : remaining !== null && plan
                  ? `${remaining} messages left on ${plan} plan`
                  : "Ask how to fix your audits"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-white/60 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 text-sm">
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "user"
                    ? "flex justify-end"
                    : "flex justify-start"
                }
              >
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[80%] rounded-2xl bg-fuchsia-600/80 px-3 py-2"
                      : "max-w-[80%] rounded-2xl bg-white/5 border border-white/10 px-3 py-2"
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="text-xs text-white/60">Thinking…</div>
            )}
          </div>

          {error && (
            <div className="px-4 py-2 text-[11px] text-red-300 bg-red-900/30 border-t border-red-700/40">
              {error}
            </div>
          )}

          <div className="border-t border-white/10 px-3 py-2 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask how to fix an audit…"
              className="flex-1 bg-transparent outline-none text-sm px-2 py-1"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 p-2"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
