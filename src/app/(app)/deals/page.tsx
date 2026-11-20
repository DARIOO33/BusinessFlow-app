import type { Metadata } from "next";
import { DealsBoard } from "./deals-board";

export const metadata: Metadata = { title: "Deals" };

// /deals?deal=<id> opens that deal (used by links on contact and organization pages)
export default async function DealsPage({ searchParams }: { searchParams: Promise<{ deal?: string }> }) {
  const { deal } = await searchParams;
  return <DealsBoard openDealId={deal ?? null} />;
}
