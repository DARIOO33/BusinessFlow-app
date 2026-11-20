import type { Metadata } from "next";
import { Wordmark } from "@/components/brand";
import { AcceptInvite } from "./accept-invite";

export const metadata: Metadata = { title: "Invitation" };

// Public page: the link sent to an invited person. /invite/:token
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="on-board bg-board px-6 py-3.5">
        <Wordmark />
      </header>
      <main className="flex flex-1 justify-center px-6 py-14">
        <AcceptInvite token={token} />
      </main>
    </div>
  );
}
