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
      <Button asChild variant="outline" className="border-[#bdb5a7] bg-transparent px-5 text-[#18324a] hover:bg-[#f1eee8]">
        <Link href="/auth">Sign in</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link href="/dashboard" className="hidden text-sm font-medium text-slate-600 hover:text-[#18324a] sm:block">
        {user.name || user.email}
      </Link>
      <Button type="button" variant="outline" className="border-[#bdb5a7] bg-transparent px-4 text-[#18324a] hover:bg-[#f1eee8]" onClick={signOut}>
        Sign out
      </Button>
    </div>
  );
}
