import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { BrandMark } from "@/components/BrandMark";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Rankcore.ai",
    template: "%s | Rankcore.ai",
  },
  description:
    "Rankcore.ai — AI-powered backlink intelligence, toxicity detection, competitor analysis, and automated SEO monitoring.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Rankcore.ai",
    description:
      "AI-powered backlink intelligence with toxicity detection, competitor gap analysis, and automated monitoring.",
    url: "https://rankcore.ai",
    siteName: "Rankcore.ai",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rankcore.ai",
    description:
      "AI-powered backlink intelligence, toxicity detection, and competitor analysis.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-white text-black antialiased`}
      >
        <header className="sticky top-0 z-50 border-b border-black/10 bg-white/90 backdrop-blur-xl">
          <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
            <BrandMark />

            <nav className="hidden items-center gap-7 lg:flex">
              <Link
                href="/#platform"
                className="text-sm font-medium text-black/60 transition hover:text-black"
              >
                Platform
              </Link>
              <Link
                href="/pricing"
                className="text-sm font-medium text-black/60 transition hover:text-black"
              >
                Pricing
              </Link>
              <Link
                href="/about"
                className="text-sm font-medium text-black/60 transition hover:text-black"
              >
                About
              </Link>
              <Link
                href="/blog"
                className="text-sm font-medium text-black/60 transition hover:text-black"
              >
                Resources
              </Link>
              <Link
                href="/support"
                className="text-sm font-medium text-black/60 transition hover:text-black"
              >
                Support
              </Link>
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/login"
                className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-black/65 transition hover:bg-black/[0.04] hover:text-black sm:px-4"
              >
                Sign In
              </Link>
              <Link
                href="/register?free=1"
                className="whitespace-nowrap rounded-lg bg-black px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-black/80 sm:px-4"
              >
                Start free
              </Link>
            </div>
          </div>
        </header>

        {children}

        <SpeedInsights />
      </body>
    </html>
  );
}
