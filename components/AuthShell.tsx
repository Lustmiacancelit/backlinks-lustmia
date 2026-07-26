import type { ReactNode } from "react";
import { BarChart3, Check, Link2, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="min-h-[calc(100vh-72px)] bg-[#f4f4f1] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto grid min-h-[650px] w-full max-w-5xl overflow-hidden rounded-[1.75rem] border border-black/10 bg-white shadow-[0_28px_90px_rgba(0,0,0,0.10)] lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="relative hidden overflow-hidden bg-black p-10 text-white lg:flex lg:flex-col">
          <div className="soft-noise absolute inset-0 opacity-25" />
          <div className="relative">
            <BrandMark inverse />
          </div>

          <div className="relative mt-auto">
            <p className="max-w-sm text-3xl font-semibold leading-[1.08] tracking-[-0.045em]">
              Turn backlink noise into your next ranking move.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
                <div className="flex items-center justify-between">
                  <BarChart3 className="h-4 w-4 text-white/50" />
                  <span className="text-[9px] font-semibold text-emerald-300">
                    +4.8%
                  </span>
                </div>
                <p className="mt-5 text-2xl font-semibold">72</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/35">
                  Authority
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
                <div className="flex items-center justify-between">
                  <ShieldCheck className="h-4 w-4 text-white/50" />
                  <span className="text-[9px] font-semibold text-emerald-300">
                    Healthy
                  </span>
                </div>
                <p className="mt-5 text-2xl font-semibold">Low</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/35">
                  Link risk
                </p>
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.06] p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-black">
                  <Link2 className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-semibold">
                    18 new referring domains
                  </p>
                  <p className="mt-1 text-[10px] text-white/35">
                    Your weekly link brief is ready
                  </p>
                </div>
                <Check className="ml-auto h-4 w-4 text-emerald-300" />
              </div>
            </div>
          </div>
        </aside>

        <section className="flex flex-col p-6 sm:p-10 lg:p-12">
          <div className="mb-10 lg:hidden">
            <BrandMark />
          </div>

          <div className="my-auto">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-black/50">
              {description}
            </p>

            <div className="mt-8">{children}</div>
          </div>

          <div className="mt-9 border-t border-black/10 pt-6">{footer}</div>
        </section>
      </div>
    </main>
  );
}
