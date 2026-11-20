"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { signIn } from "@/lib/auth-client";
import { Alert, Button, Field } from "@/components/ui";

export function SignInForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    setError("");
    const { error } = await signIn.email({
      email: String(form.get("email")).trim(),
      password: String(form.get("password")),
    });
    if (error) {
      setLoading(false);
      setError(
        error.status === 401
          ? "That email and password don't match. Check both and try again."
          : (error.message ?? "Sign in failed. Try again."),
      );
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <h1 className="text-[28px] leading-tight font-bold tracking-[-0.01em]">Sign in</h1>
      {error && <Alert>{error}</Alert>}
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required />
      <Button type="submit" variant="primary" loading={loading}>
        Sign in
      </Button>
      <Button disabled>Continue with Google (coming soon)</Button>
      <p className="text-center text-[15px] text-muted">
        New to BusinessFlow?{" "}
        <Link href={`/sign-up${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-ink underline underline-offset-[3px]">
          Create an account
        </Link>
      </p>
    </form>
  );
}

// Only allow redirects to our own pages ("/team"), never to other sites ("//evil.com").
export function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}
