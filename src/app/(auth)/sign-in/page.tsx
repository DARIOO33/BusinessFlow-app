"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { signIn } from "@/lib/auth-client";

function SignInForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/dashboard";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    setError("");
    const { error } = await signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setLoading(false);
    if (error) return setError(error.message ?? "Sign in failed");
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <h1 className="mb-2 text-2xl font-semibold">Sign in</h1>
      <input name="email" type="email" placeholder="Email" required className="rounded-lg border px-3 py-2" />
      <input name="password" type="password" placeholder="Password" required className="rounded-lg border px-3 py-2" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
        {loading ? "Signing in..." : "Sign in"}
      </button>
      <p className="text-sm opacity-70">
        No account? <Link href="/sign-up" className="underline">Create one</Link>
      </p>
    </form>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
