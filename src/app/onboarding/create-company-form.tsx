"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError, useApi, type Me } from "@/lib/api-client";
import { Alert, Button, FieldError } from "@/components/ui";
import { cn } from "@/lib/utils";

type Errors = { name?: string; slug?: string; form?: string };

export function CreateCompanyForm() {
  const router = useRouter();
  const me = useApi<Me>("/api/me");
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const hasCompanies = (me.data?.companies.length ?? 0) > 0;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name")).trim();
    const slug = String(form.get("slug")).trim().toLowerCase();

    if (name.length < 2) return setErrors({ name: "Enter at least 2 characters." });
    setErrors({});
    setLoading(true);
    try {
      await api("/api/companies", { method: "POST", body: { name, slug: slug || undefined } });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setLoading(false);
      const message = err instanceof ApiError ? err.message : "Something went wrong. Try again.";
      if (err instanceof ApiError && err.status === 409) {
        setErrors({ slug: `${slug} is taken. Try ${slug}-${Math.floor(Math.random() * 90 + 10)}.` });
      } else if (/slug/i.test(message)) setErrors({ slug: message.replace(/"/g, "") });
      else if (/name/i.test(message)) setErrors({ name: message.replace(/"/g, "") });
      else setErrors({ form: message });
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-[460px] flex-col gap-[22px]" noValidate>
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] leading-tight font-bold tracking-[-0.01em]">Create your company</h1>
        <p className="text-base leading-relaxed text-muted">
          It&apos;s the shared space for your contacts, projects and invoices. You&apos;ll be its owner and can invite
          your team next.
        </p>
      </div>
      {errors.form && <Alert>{errors.form}</Alert>}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="cc-name" className="text-sm font-semibold">
          Company name
        </label>
        <input
          id="cc-name"
          name="name"
          autoComplete="organization"
          required
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "cc-name-error" : undefined}
          className="min-h-11 w-full rounded-md border border-line-strong bg-white px-3 py-2.5 text-[15px] hover:border-[#9aa09c] focus:border-ink focus:ring-[3px] focus:ring-signal/45 focus:outline-none aria-[invalid=true]:border-alarm"
        />
        {errors.name && <FieldError id="cc-name-error">{errors.name}</FieldError>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="cc-slug" className="text-sm font-semibold">
          Workspace address
        </label>
        <div
          className={cn(
            "flex min-h-11 items-stretch overflow-hidden rounded-md border bg-white focus-within:border-ink focus-within:ring-[3px] focus-within:ring-signal/45",
            errors.slug ? "border-alarm" : "border-line-strong",
          )}
        >
          <span className="flex items-center border-r border-line bg-line-soft px-3 text-sm whitespace-nowrap text-muted">
            businessflow.app/
          </span>
          <input
            id="cc-slug"
            name="slug"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={errors.slug ? true : undefined}
            aria-describedby={cn(errors.slug && "cc-slug-error", "cc-slug-hint")}
            className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-[15px] focus:outline-none"
          />
        </div>
        {errors.slug && <FieldError id="cc-slug-error">{errors.slug}</FieldError>}
        <p id="cc-slug-hint" className="text-[13px] leading-snug text-subtle">
          Optional. Lowercase letters, numbers and dashes. Leave it empty and we&apos;ll make one from the name.
        </p>
      </div>

      <div className="on-board flex flex-wrap items-center gap-3 rounded-md bg-board px-3.5 py-3 text-sm text-flap">
        <span className="tile text-signal">Free · 14-day trial</span>
        <span className="text-board-text">No card needed.</span>
      </div>

      <Button type="submit" variant="primary" loading={loading}>
        Create company
      </Button>
      {hasCompanies ? (
        <Link href="/dashboard" className="text-center text-sm font-semibold underline underline-offset-[3px]">
          Back to {me.data?.activeCompany?.name ?? "your company"}
        </Link>
      ) : (
        <p className="text-center text-sm text-subtle">Were you invited? Open the link from your invitation instead.</p>
      )}
    </form>
  );
}
