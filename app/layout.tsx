import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
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
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}
      >
        {/* Global Header */}
        <header className="sticky top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-white/10 ring-1 ring-white/15" />
              <div className="leading-tight">
                <div className="font-semibold">Rankcore.ai</div>
                <div className="text-xs text-white/60">Backlink Intelligence</div>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="hidden items-center gap-6 md:flex">
              <Link href="/features" className="text-white/80 hover:text-white transition">
                Features
              </Link>
              <Link href="/pricing" className="text-white/80 hover:text-white transition">
                Pricing
              </Link>
              <Link href="/blog" className="text-white/80 hover:text-white transition">
                Blog
              </Link>
              <Link href="/about" className="text-white/80 hover:text-white transition">
                About
              </Link>
              <Link href="/support" className="text-white/80 hover:text-white transition">
                Support
              </Link>
              <Link href="/privacy" className="text-white/80 hover:text-white transition">
                Privacy
              </Link>
              <Link href="/terms" className="text-white/80 hover:text-white transition">
                Terms
              </Link>
            </nav>

            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm text-white/80 hover:text-white transition"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-fuchsia-600 px-4 py-2 text-sm font-medium hover:opacity-90 transition"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        {children}

        <SpeedInsights />
      </body>
    </html>
  );
}