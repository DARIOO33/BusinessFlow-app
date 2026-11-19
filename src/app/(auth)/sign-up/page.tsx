"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signUp } from "@/lib/auth-client";

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    setError("");
    const { error } = await signUp.email({
      name: String(form.get("name")),
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setLoading(false);
    if (error) return setError(error.message ?? "Sign up failed");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <h1 className="mb-2 text-2xl font-semibold">Create account</h1>
      <input name="name" placeholder="Name" required className="rounded-lg border px-3 py-2" />
      <input name="email" type="email" placeholder="Email" required className="rounded-lg border px-3 py-2" />
      <input name="password" type="password" placeholder="Password (8+ characters)" minLength={8} required className="rounded-lg border px-3 py-2" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
        {loading ? "Creating..." : "Create account"}
      </button>
      <p className="text-sm opacity-70">
        Already have an account? <Link href="/sign-in" className="underline">Sign in</Link>
      </p>
    </form>
  );
}
