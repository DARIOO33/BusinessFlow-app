"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { signUp } from "@/lib/auth-client";
import { Alert, Button, Field } from "@/components/ui";
import { safeNext } from "../sign-in/sign-in-form";

type Errors = { name?: string; email?: string; password?: string; form?: string };

export function SignUpForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name")).trim().replace(/\s+/g, " ");
    const email = String(form.get("email")).trim();
    const password = String(form.get("password"));

    // Same rules as the server, checked first for a faster answer
    const found: Errors = {};
    if (name.length < 2 || name.length > 100) found.name = "Enter your name (2 to 100 characters).";
    if (!email) found.email = "Enter your email.";
    if (password.length < 8) found.password = "Use at least 8 characters.";
    setErrors(found);
    if (Object.keys(found).length) return;

    setLoading(true);
    const { error } = await signUp.email({ name, email, password });
    if (error) {
      setLoading(false);
      const message = error.message ?? "Sign up failed. Try again.";
      if (error.status === 422) setErrors({ email: "An account with this email already exists. Sign in instead." });
      else if (/email/i.test(message)) setErrors({ email: "Enter a valid email address." });
      else if (/name/i.test(message)) setErrors({ name: message });
      else if (/password/i.test(message)) setErrors({ password: message });
      else setErrors({ form: message });
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <h1 className="text-[28px] leading-tight font-bold tracking-[-0.01em]">Create your account</h1>
      {errors.form && <Alert>{errors.form}</Alert>}
      <Field label="Full name" name="name" autoComplete="name" error={errors.name} required />
      <Field label="Work email" name="email" type="email" autoComplete="email" error={errors.email} required />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters."
        error={errors.password}
        required
      />
      <Button type="submit" variant="primary" loading={loading}>
        Create account
      </Button>
      <Button disabled>Continue with Google (coming soon)</Button>
      <p className="text-center text-[15px] text-muted">
        Already have an account?{" "}
        <Link href={`/sign-in${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-ink underline underline-offset-[3px]">
          Sign in
        </Link>
      </p>
    </form>
  );
}
