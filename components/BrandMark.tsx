import Link from "next/link";
import { Link2 } from "lucide-react";

export function BrandMark({
  inverse = false,
  showTagline = true,
}: {
  inverse?: boolean;
  showTagline?: boolean;
}) {
  return (
    <Link href="/" className="group inline-flex items-center gap-3">
      <span
        className={`grid h-10 w-10 place-items-center rounded-xl border transition-transform group-hover:-rotate-3 ${
          inverse
            ? "border-white/15 bg-white text-black"
            : "border-black bg-black text-white"
        }`}
      >
        <Link2 className="h-5 w-5" strokeWidth={2.25} />
      </span>
      <span className="leading-none">
        <span
          className={`block text-[17px] font-semibold tracking-[-0.03em] ${
            inverse ? "text-white" : "text-black"
          }`}
        >
          Rankcore.ai
        </span>
        {showTagline && (
          <span
            className={`mt-1 hidden text-[10px] font-medium uppercase tracking-[0.18em] sm:block ${
              inverse ? "text-white/50" : "text-black/45"
            }`}
          >
            Backlink intelligence
          </span>
        )}
      </span>
    </Link>
  );
}
