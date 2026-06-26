import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Sans, Newsreader } from "next/font/google";
import { Map } from "lucide-react";
import { UserNav } from "@/components/auth/user-nav";
import "./globals.css";

const bodyFont = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex",
});

const displayFont = Newsreader({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-newsreader",
});

export const metadata: Metadata = {
  title: "CivicLoom AI",
  description: "Local market intelligence, made actionable.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${displayFont.variable} bg-[#faf9f6] font-sans antialiased`}>
        <header className="sticky top-0 z-20 border-b border-[#ded8cb] bg-[#faf9f6]">
          <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-6 lg:px-10">
            <Link href="/" className="flex items-center gap-2.5 text-[22px] font-bold tracking-[-.04em] text-[#102033]">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#18324a] text-white">
                <Map className="h-5 w-5" />
              </span>
              CivicLoom <span className="text-[#285f8f]">AI</span>
            </Link>
            <nav className="hidden items-center gap-9 text-[15px] font-medium text-slate-600 sm:flex">
              <Link className="hover:text-[#18324a]" href="/dashboard">
                Product
              </Link>
              <Link className="hover:text-[#18324a]" href="/compare">
                Compare
              </Link>
              <Link className="hover:text-[#18324a]" href="/pricing">
                Pricing
              </Link>
            </nav>
            <UserNav />
          </div>
        </header>
        {children}
        <footer className="border-t border-[#ded8cb] px-6 py-8 text-center text-sm text-slate-500">
          © 2026 CivicLoom AI · Built for better local decisions
        </footer>
      </body>
    </html>
  );
}
