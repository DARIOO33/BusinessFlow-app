"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { initials } from "@/lib/api-client";
import { roleLabel } from "@/lib/roles";
import { useMe } from "@/components/me-provider";
import { Tile } from "@/components/ui";
import { cn } from "@/lib/utils";

// Top of the sidebar: the active company as flap tiles + a menu to switch.
export function CompanySwitcher() {
  const { me, company, switchCompany } = useMe();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on click outside or Escape
  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function pick(id: string) {
    if (id === company.id) return setOpen(false);
    setBusyId(id);
    setError("");
    try {
      await switchCompany(id);
      setOpen(false);
    } catch {
      setError("Couldn't switch. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="company-menu"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-2.5 rounded-lg border border-board-line p-2.5 text-left hover:bg-tile"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="sr-only">Active company:</span>
          <span className="flex flex-wrap gap-0.5">
            {company.name.split(/\s+/).map((word, i) => (
              <Tile key={i} className="px-[7px] py-2 text-[15px]">
                {word}
              </Tile>
            ))}
          </span>
          <Tile tone="live" className="self-start">
            {roleLabel(company.role)}
          </Tile>
        </span>
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("mt-1.5 flex-none text-board-text transition-transform", open && "rotate-180")}>
          <path d="m6 9 6 6 6-6" />
        </svg>
        <span className="sr-only">Switch company</span>
      </button>

      {open && (
        <div
          id="company-menu"
          className="absolute top-[calc(100%+8px)] left-0 z-20 flex w-[300px] max-w-[calc(100vw-32px)] flex-col gap-0.5 rounded-[10px] bg-white p-2 text-ink shadow-[0_16px_40px_rgba(17,19,21,0.28),0_2px_6px_rgba(17,19,21,0.12)]"
        >
          <p className="px-2.5 pt-2 pb-1.5 font-cond text-[13px] font-semibold tracking-[0.08em] text-subtle uppercase">
            Your companies
          </p>
          <ul className="flex flex-col gap-0.5">
            {me.companies.map((c) => {
              const active = c.id === company.id;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    aria-current={active || undefined}
                    disabled={busyId !== null}
                    onClick={() => pick(c.id)}
                    className={cn(
                      "flex min-h-12 w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[15px] hover:bg-ground disabled:cursor-wait",
                      active && "bg-ground font-semibold",
                    )}
                  >
                    <span aria-hidden="true" className="flex size-[30px] flex-none items-center justify-center rounded bg-board font-cond text-sm font-semibold text-flap">
                      {initials(c.name)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    <span className="tile px-1.5 py-[5px] text-[11px]">{roleLabel(c.role)}</span>
                    <span className="flex w-4 flex-none">
                      {busyId === c.id ? (
                        <svg aria-label="Switching" role="img" className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
                          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                      ) : (
                        active && (
                          <svg role="img" aria-label="Active" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        )
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {error && <p className="px-2.5 py-1 text-[13px] text-danger">{error}</p>}
          <div className="my-1.5 h-px bg-line-soft" />
          <Link href="/onboarding" className="flex min-h-12 items-center gap-2.5 rounded-md px-2.5 text-[15px] font-semibold no-underline hover:bg-ground">
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-[7px]">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Create a company
          </Link>
        </div>
      )}
    </div>
  );
}
