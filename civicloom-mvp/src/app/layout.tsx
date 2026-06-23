import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import { Button } from "@/components/ui/button";
import "./globals.css";
const inter = Inter({subsets:["latin"]});
export const metadata: Metadata = { title:"CivicLoom AI", description:"Local market intelligence, made actionable." };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body className={`${inter.className} bg-white text-slate-900 antialiased`}><header className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6"><Link href="/" className="text-lg font-semibold tracking-tight">civic<span className="text-cyan-700">loom</span><span className="ml-1 text-xs font-bold text-slate-400">AI</span></Link><nav className="hidden items-center gap-6 text-sm text-slate-600 sm:flex"><Link href="/dashboard">Dashboard</Link><Link href="/compare">Compare</Link><Link href="/pricing">Pricing</Link></nav><Button asChild size="sm" className="bg-slate-950"><Link href="/report/new">Create report</Link></Button></div></header>{children}<footer className="border-t border-slate-100 px-6 py-8 text-center text-sm text-slate-500">© 2026 CivicLoom AI · Built for better local decisions</footer></body></html> }
