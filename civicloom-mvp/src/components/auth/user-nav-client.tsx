"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AuthUser } from "@/lib/auth";

function displayName(user: AuthUser) {
  return user.name || user.email.split("@")[0] || "Account";
}

function initials(user: AuthUser) {
  const label = displayName(user);
  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return label.slice(0, 2).toUpperCase();
}

export function UserNavClient({ user }: { user: AuthUser }) {
  const router = useRouter();
  const name = displayName(user);

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="group relative">
      <button
        type="button"
        className="flex h-11 items-center gap-3 rounded-full border border-[#d6cebf] bg-white px-2.5 pr-3 text-left shadow-sm transition hover:border-[#b8ad9d] hover:bg-[#f7f4ed]"
        aria-label="Open account menu"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-[#18324a] text-xs font-bold tracking-wide text-white">{initials(user)}</span>
        <span className="hidden max-w-[150px] truncate text-sm font-semibold text-[#102033] md:block">{name}</span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      <div className="invisible absolute right-0 top-full z-30 mt-2 w-64 rounded-2xl border border-[#ded8cb] bg-white p-2 opacity-0 shadow-[0_18px_45px_rgba(16,32,51,.12)] transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
        <div className="border-b border-[#eee8dc] px-3 py-3">
          <p className="truncate text-sm font-semibold text-[#102033]">{name}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">{user.email}</p>
        </div>
        <Link href="/dashboard" className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#102033] hover:bg-[#f7f4ed]">
          <UserRound className="h-4 w-4 text-[#285f8f]" />
          Dashboard
        </Link>
        <button
          type="button"
          onClick={signOut}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-[#8a2f2f] hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}
