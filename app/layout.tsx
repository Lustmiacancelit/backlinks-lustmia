import type { Metadata } from "next";
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
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
