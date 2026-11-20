"use client";

import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

// Small pieces shared by the CRM list pages.

export const TH =
  "bg-panel-head px-5 py-2.5 text-left font-cond text-[13px] font-semibold tracking-[0.08em] text-subtle uppercase whitespace-nowrap";
export const TD = "border-t border-line-soft px-5 py-3 align-middle";

export function SearchBox({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <div className="relative min-w-0 flex-[1_1_260px]">
      <label htmlFor="crm-search" className="sr-only">
        {label}
      </label>
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-subtle">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        id="crm-search"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        className="min-h-11 w-full rounded-md border border-line-strong bg-white py-2.5 pr-3 pl-9 text-[15px] hover:border-[#9aa09c] focus:border-ink focus:ring-[3px] focus:ring-signal/45 focus:outline-none"
      />
    </div>
  );
}

// Segmented filter: All / Leads / Clients
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-line-strong bg-white p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "min-h-10 rounded px-3.5 text-sm font-semibold text-muted hover:text-ink",
            value === opt.value && "bg-board text-flap hover:text-flap",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function Pager({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-3 border-t border-line-soft px-5 py-3 text-sm text-muted tabular-nums">
      <span>
        Page {page} of {pages} · {total} total
      </span>
      <div className="flex gap-2">
        <Button size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </nav>
  );
}

export function EmptyRow({ children }: { children: React.ReactNode }) {
  return <p className="border-t border-line-soft px-5 py-8 text-center text-[15px] text-muted">{children}</p>;
}
