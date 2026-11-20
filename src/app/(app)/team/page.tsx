import type { Metadata } from "next";
import { TeamView } from "./team-view";

export const metadata: Metadata = { title: "Team" };

// /team?invite=1 opens the invite dialog directly (used by the dashboard)
export default async function TeamPage({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const { invite } = await searchParams;
  return <TeamView openInvite={invite === "1"} />;
}
