"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError, formatDate, useApi } from "@/lib/api-client";
import { signOut, useSession } from "@/lib/auth-client";
import { roleLabel, type Role } from "@/lib/roles";
import { Alert, Button, ButtonLink, Skeleton, Tile } from "@/components/ui";

type Preview = { companyName: string; email: string; role: Role; expiresAt: string };

export function AcceptInvite({ token }: { token: string }) {
  const router = useRouter();
  const preview = useApi<Preview>(`/api/invitations/token/${encodeURIComponent(token)}`);
  const session = useSession();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const here = `/invite/${encodeURIComponent(token)}`;

  if (preview.loading || session.isPending) {
    return (
      <div className="flex w-full max-w-[520px] flex-col gap-4" aria-busy="true">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (preview.error || !preview.data) {
    const status = preview.error?.status;
    return (
      <StateCard
        tile={status === 410 ? "Expired" : "Not found"}
        title={status === 410 ? "This invitation expired" : "Invitation not found"}
        text={
          status === 410
            ? "Ask an admin of the company to send you a new one."
            : "It was cancelled, or someone already used it. Ask the person who invited you for a new link."
        }
      />
    );
  }

  const invite = preview.data;
  const user = session.data?.user;
  const wrongAccount = user && user.email.toLowerCase() !== invite.email;

  async function accept() {
    setLoading(true);
    setError("");
    try {
      await api(`/api/invitations/token/${encodeURIComponent(token)}/accept`, { method: "POST" });
      setAccepted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function switchAccount() {
    await signOut();
    router.push(`/sign-in?next=${encodeURIComponent(here)}`);
  }

  return (
    <div className="flex w-full max-w-[520px] flex-col gap-6">
      <section className="on-board flex flex-col gap-6 rounded-xl bg-board p-8 text-flap">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[15px] text-board-muted">Invitation</span>
          <span role="status" aria-live="polite">
            <Tile tone={accepted ? "ok" : "live"}>{accepted ? "Joined" : "Pending"}</Tile>
          </span>
        </div>
        <div className="flex flex-col gap-2.5">
          <h1 className="text-[30px] leading-tight font-bold tracking-[-0.01em]">Join {invite.companyName}</h1>
          <p className="text-base leading-relaxed text-board-text">
            This invitation is for <strong className="text-flap">{invite.email}</strong>.
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-[3px]">
          <div className="flex flex-col gap-1.5 rounded bg-tile px-3.5 py-3">
            <dt className="font-cond text-[13px] font-semibold tracking-[0.08em] text-board-muted uppercase">Role</dt>
            <dd className="text-lg font-semibold">{roleLabel(invite.role)}</dd>
          </div>
          <div className="flex flex-col gap-1.5 rounded bg-tile px-3.5 py-3">
            <dt className="font-cond text-[13px] font-semibold tracking-[0.08em] text-board-muted uppercase">Expires</dt>
            <dd className="text-lg font-semibold tabular-nums">{formatDate(invite.expiresAt)}</dd>
          </div>
        </dl>

        {error && <Alert>{error}</Alert>}

        {accepted ? (
          <ButtonLink href="/dashboard" variant="primary" onClick={() => router.refresh()}>
            Open {invite.companyName}
          </ButtonLink>
        ) : !user ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-board-muted">Sign in or create an account with {invite.email} to accept.</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <ButtonLink href={`/sign-in?next=${encodeURIComponent(here)}`} variant="primary">
                Sign in
              </ButtonLink>
              <ButtonLink href={`/sign-up?next=${encodeURIComponent(here)}`} variant="board">
                Create account
              </ButtonLink>
            </div>
          </div>
        ) : wrongAccount ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <Tile tone="alarm">Wrong account</Tile>
              <span className="text-sm text-board-text">You&apos;re signed in as {user.email}.</span>
            </div>
            <Button variant="board" onClick={switchAccount}>
              Sign out and use {invite.email}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-board-muted">
              Signed in as <span className="text-flap">{user.email}</span>
            </p>
            <Button variant="primary" loading={loading} onClick={accept}>
              Accept and join
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

function StateCard({ tile, title, text }: { tile: string; title: string; text: string }) {
  return (
    <section className="flex w-full max-w-[520px] flex-col gap-3 self-start rounded-lg border border-line bg-white p-6">
      <Tile className="self-start">{tile}</Tile>
      <h1 className="text-[22px] font-bold">{title}</h1>
      <p className="text-[15px] leading-relaxed text-muted">{text}</p>
      <ButtonLink href="/" className="mt-2 self-start">
        Go to BusinessFlow
      </ButtonLink>
    </section>
  );
}
