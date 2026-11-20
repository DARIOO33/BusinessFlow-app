"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    await signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={cn("min-h-9 rounded-md px-2 text-[13px] text-board-text underline underline-offset-[3px] hover:text-flap disabled:opacity-50", className)}
    >
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
