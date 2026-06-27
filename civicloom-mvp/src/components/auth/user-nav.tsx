import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { UserNavClient } from "./user-nav-client";

export async function UserNav() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Button asChild variant="outline" className="border-[#bdb5a7] bg-transparent px-5 text-[#18324a] hover:bg-[#f1eee8]">
        <Link href="/auth">Sign in</Link>
      </Button>
    );
  }

  return <UserNavClient user={user} />;
}
