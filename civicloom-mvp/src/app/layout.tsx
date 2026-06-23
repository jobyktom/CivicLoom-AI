import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import { Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import "./globals.css";
const inter = Inter({subsets:["latin"]});
export const metadata: Metadata = { title:"CivicLoom AI", description:"Local market intelligence, made actionable." };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body className={`${inter.className} antialiased`}><header className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur"><div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-6 lg:px-10"><Link href="/" className="flex items-center gap-2.5 text-[22px] font-bold tracking-[-.04em]"><span className="grid h-9 w-9 place-items-center rounded-lg brand-gradient text-white shadow-md shadow-blue-500/25"><Map className="h-5 w-5"/></span>CivicLoom <span className="text-[#1769ff]">AI</span></Link><nav className="hidden items-center gap-9 text-[15px] font-medium text-slate-600 sm:flex"><Link className="hover:text-[#1769ff]" href="/dashboard">Product</Link><Link className="hover:text-[#1769ff]" href="/compare">Compare</Link><Link className="hover:text-[#1769ff]" href="/pricing">Pricing</Link></nav><Button asChild variant="outline" className="border-slate-300 bg-white px-5 text-[#061535] hover:bg-slate-50"><Link href="/auth">Sign in</Link></Button></div></header>{children}<footer className="border-t border-slate-100 px-6 py-8 text-center text-sm text-slate-500">© 2026 CivicLoom AI · Built for better local decisions</footer></body></html> }
