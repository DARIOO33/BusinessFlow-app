"use client";

import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";

// Native <dialog>: focus trap, Escape and backdrop come for free.
export function Modal({
  open,
  onClose,
  title,
  description,
  wide = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={titleId}
      className={cn(
        "m-auto w-[calc(100%-32px)] overflow-visible rounded-[10px] bg-white p-0 text-ink shadow-[0_24px_60px_rgba(17,19,21,0.35),0_2px_8px_rgba(17,19,21,0.15)]",
        wide ? "max-w-[640px]" : "max-w-[500px]",
      )}
    >
      {open && (
        <div className="flex max-h-[calc(100vh-48px)] flex-col gap-5 overflow-y-auto p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <h2 id={titleId} className="text-[22px] leading-tight font-bold">
                {title}
              </h2>
              {description && <p className="text-sm leading-snug text-muted">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mt-2.5 -mr-2.5 flex size-11 flex-none items-center justify-center rounded-md text-muted hover:bg-ground"
            >
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
