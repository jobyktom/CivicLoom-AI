"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type User = { id: string; email: string; name?: string | null };

export function UserNav() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((payload) => setUser(payload.user || null))
      .catch(() => setUser(null));
  }, []);

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  }

  if (!user) {
    return (
      <Button asChild variant="outline" className="border-slate-300 bg-white px-5 text-[#061535] hover:bg-slate-50">
        <Link href="/auth">Sign in</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link href="/dashboard" className="hidden text-sm font-medium text-slate-600 hover:text-[#1769ff] sm:block">
        {user.name || user.email}
      </Link>
      <Button type="button" variant="outline" className="border-slate-300 bg-white px-4 text-[#061535] hover:bg-slate-50" onClick={signOut}>
        Sign out
      </Button>
    </div>
  );
}

