"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

// Small UI kit for the "departure board" design. Plain Tailwind, no library.

// ---------- Split-flap tile ----------

type TileTone = "default" | "live" | "dim" | "ok" | "alarm";

const TILE_TONE: Record<TileTone, string> = {
  default: "",
  live: "text-signal",
  dim: "text-board-muted",
  ok: "text-ok",
  alarm: "bg-alarm text-white",
};

// Shows a status. When `children` changes, the tile flips (not on first render).
export function Tile({
  children,
  tone = "default",
  className,
}: {
  children: string;
  tone?: TileTone;
  className?: string;
}) {
  // "Store the previous value" pattern from the React docs: count changes.
  const [prev, setPrev] = useState(children);
  const [changes, setChanges] = useState(0);
  if (children !== prev) {
    setPrev(children);
    setChanges(changes + 1);
  }

  return (
    <span key={changes} className={cn("tile", TILE_TONE[tone], changes > 0 && "tile-flip", className)}>
      {children}
    </span>
  );
}

// ---------- Buttons ----------

type Variant = "primary" | "secondary" | "danger" | "board";

const VARIANT: Record<Variant, string> = {
  primary: "bg-signal text-ink hover:brightness-95",
  secondary: "border-line-strong bg-white text-ink hover:bg-ground",
  danger: "border-danger-line bg-white text-danger hover:bg-danger-bg",
  board: "border-board-line bg-transparent text-flap hover:bg-tile",
};

function buttonClass(variant: Variant, size: "md" | "sm", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent font-semibold no-underline transition-[filter,background-color] duration-150",
    "disabled:cursor-not-allowed disabled:opacity-50",
    size === "md" ? "min-h-11 px-[18px] text-[15px]" : "min-h-9 px-3 text-sm",
    VARIANT[variant],
    className,
  );
}

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "md" | "sm";
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass(variant, size, className)}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: Variant; size?: "md" | "sm" }) {
  return <Link {...props} className={buttonClass(variant, size, className)} />;
}

function Spinner() {
  return (
    <svg aria-hidden="true" className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ---------- Form fields ----------

const CONTROL =
  "w-full min-h-11 rounded-md border border-line-strong bg-white px-3 py-2.5 text-[15px] text-ink " +
  "hover:border-[#9aa09c] focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-signal/45 " +
  "disabled:cursor-not-allowed disabled:bg-line-soft disabled:text-muted " +
  "aria-[invalid=true]:border-alarm read-only:bg-line-soft read-only:text-muted";

type FieldProps = {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | null;
  className?: string;
};

function FieldShell({
  id,
  label,
  hint,
  error,
  className,
  children,
}: FieldProps & { id: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
      {hint && (
        <p id={`${id}-hint`} className="text-[13px] leading-snug text-subtle">
          {hint}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, error?: string | null, hint?: React.ReactNode) {
  return [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;
}

export function Field({
  label,
  hint,
  error,
  className,
  ...props
}: FieldProps & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <input
        id={id}
        {...props}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={CONTROL}
      />
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  className,
  ...props
}: FieldProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <textarea
        id={id}
        rows={2}
        {...props}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(CONTROL, "resize-y")}
      />
    </FieldShell>
  );
}

export function SelectField({
  label,
  hint,
  error,
  className,
  children,
  ...props
}: FieldProps & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <select
        id={id}
        {...props}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={CONTROL}
      >
        {children}
      </select>
    </FieldShell>
  );
}

function ErrorIcon() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-none">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}

export function FieldError({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p id={id} className="flex gap-1.5 text-[13px] text-danger">
      <ErrorIcon />
      <span>{children}</span>
    </p>
  );
}

// ---------- Messages ----------

export function Alert({ children, tone = "error" }: { children: React.ReactNode; tone?: "error" | "success" }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-md border px-3.5 py-3 text-sm leading-snug",
        tone === "error" ? "border-[#f1c4c0] bg-danger-bg text-[#7a1912]" : "border-[#b9e2c9] bg-[#ecf8f0] text-[#14532d]",
      )}
    >
      {tone === "error" ? (
        <ErrorIcon />
      ) : (
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-none">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
      <span>{children}</span>
    </div>
  );
}

// ---------- Layout pieces ----------

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[28px] leading-tight font-bold tracking-[-0.01em]">{title}</h1>
        {subtitle && <p className="text-[15px] text-muted tabular-nums">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("rounded-lg border border-line bg-white", className)}>{children}</section>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-line-soft", className)} />;
}

export function Avatar({ text, dark = false }: { text: string; dark?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-9 flex-none items-center justify-center rounded-full text-[13px] font-semibold",
        dark ? "bg-board-divider text-flap" : "bg-[#e4e6e3] text-ink",
      )}
    >
      {text}
    </span>
  );
}
