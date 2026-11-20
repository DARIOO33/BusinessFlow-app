"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

// The invite link with a Copy button (emails are not sent yet)
export function LinkBox({ email, url, dark = false }: { email: string; url: string; dark?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`link-${email}`} className={dark ? "text-sm text-board-text" : "text-sm font-semibold"}>
        New link for {email}. Send it to them yourself for now.
      </label>
      <div className="flex gap-2">
        <input
          id={`link-${email}`}
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className={
            dark
              ? "min-h-11 min-w-0 flex-1 rounded-md border border-board-line bg-tile px-3 font-mono text-[13px] text-flap"
              : "min-h-11 min-w-0 flex-1 rounded-md border border-line-strong bg-line-soft px-3 font-mono text-[13px] text-ink"
          }
        />
        <Button variant="primary" onClick={copy}>
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
    </div>
  );
}
