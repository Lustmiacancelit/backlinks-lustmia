import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
    default: "Lustmia Pro",
    template: "%s | Lustmia Pro",
  },
  description:
    "Lustmia Pro — Backlink intelligence, toxicity detection, competitor analysis, and automated SEO monitoring.",

  icons: {
    icon: "/favicon.ico", // put favicon.ico in /public
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png", // optional – if you add this in /public
  },

  openGraph: {
    title: "Lustmia Pro",
    description:
      "Backlink analytics powered by AI — toxicity detection, competitor gap analysis, automated monitoring.",
    url: "https://backlinks.lustmia.com",
    siteName: "Lustmia Pro",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Lustmia Pro",
    description:
      "AI-powered backlink insights, toxicity detection, and competitor analysis.",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#05030b] text-white`}
      >
        {children}
      </body>
    </html>
  );
}
