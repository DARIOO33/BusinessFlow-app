"use client";

import Link from "next/link";
import { formatMoney, stageLabel, type DealSummary } from "@/lib/crm-client";
import { Tile } from "@/components/ui";

// Compact list of deals, used on contact and organization pages.
export function DealList({ deals, currency }: { deals: DealSummary[]; currency: string }) {
  if (deals.length === 0) {
    return <p className="px-5 pb-5 text-[15px] text-muted">No deals yet.</p>;
  }
  return (
    <ul className="flex flex-col">
      {deals.map((d) => (
        <li key={d.id} className="flex items-center justify-between gap-3 border-t border-line-soft px-5 py-3">
          <Link href={`/deals?deal=${d.id}`} className="min-w-0 truncate font-semibold text-ink underline-offset-[3px] hover:underline">
            {d.title}
          </Link>
          <span className="flex flex-none items-center gap-2.5">
            <span className="text-sm text-muted tabular-nums">{formatMoney(d.value, currency)}</span>
            <Tile tone={d.stage === "WON" ? "live" : d.stage === "LOST" ? "alarm" : "default"}>{stageLabel(d.stage)}</Tile>
          </span>
        </li>
      ))}
    </ul>
  );
}
