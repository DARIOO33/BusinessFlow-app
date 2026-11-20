"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError, formatDate, type CreatedInvitation } from "@/lib/api-client";
import { roleLabel, type Role } from "@/lib/roles";
import { useMe } from "@/components/me-provider";
import { Alert, Button, Field, Tile } from "@/components/ui";
import { cn } from "@/lib/utils";
import { LinkBox } from "./link-box";

const OPTIONS: { role: Role; text: string }[] = [
  { role: "MEMBER", text: "Sees the company and the team" },
  { role: "ADMIN", text: "Edits the profile, invites people, removes Members" },
  { role: "OWNER", text: "Full control, including roles and deleting the company" },
];

// Native <dialog>: focus trap, Escape to close and backdrop come for free.
export function InviteDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { company } = useMe();
  const ref = useRef<HTMLDialogElement>(null);
  const [role, setRole] = useState<Role>("MEMBER");
  const [error, setError] = useState<{ email?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<CreatedInvitation | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function close() {
    setCreated(null);
    setError({});
    setRole("MEMBER");
    onClose();
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email")).trim();
    if (!email) return setError({ email: "Enter an email address." });

    setLoading(true);
    setError({});
    try {
      const res = await api<CreatedInvitation>("/api/invitations", { method: "POST", body: { email, role } });
      setCreated(res);
      onCreated();
    } catch (err) {
      const message = err instanceof ApiError ? err.message.replace(/"/g, "") : "Something went wrong. Try again.";
      if (err instanceof ApiError && err.status === 409) setError({ email: `${email} is already a member of ${company.name}.` });
      else if (/email/i.test(message)) setError({ email: "Enter a valid email address." });
      else setError({ form: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={close}
      aria-labelledby="invite-title"
      className="m-auto w-[calc(100%-32px)] max-w-[500px] overflow-hidden rounded-[10px] p-0 text-ink shadow-[0_24px_60px_rgba(17,19,21,0.35),0_2px_8px_rgba(17,19,21,0.15)]"
    >
      {created ? (
        <div className="on-board flex flex-col gap-4 bg-board p-6 text-flap">
          <div className="flex flex-wrap items-center gap-2.5">
            <Tile tone="ok">Created</Tile>
            <h2 id="invite-title" className="text-base font-semibold">
              {created.invitation.email} can join as {roleLabel(created.invitation.role)}
            </h2>
          </div>
          <LinkBox email={created.invitation.email} url={created.inviteLink} dark />
          <p className="text-[13px] text-board-muted tabular-nums">
            Expires {formatDate(created.invitation.expiresAt)}. Inviting the same email again makes a new link.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="board" onClick={() => setCreated(null)}>
              Invite someone else
            </Button>
            <Button variant="primary" onClick={close}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-5 p-6" noValidate>
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <h2 id="invite-title" className="text-[22px] leading-tight font-bold">
                Invite to {company.name}
              </h2>
              <p className="text-sm leading-snug text-muted">
                They join when they open the link and sign in with this email.
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="-mt-2.5 -mr-2.5 flex size-11 flex-none items-center justify-center rounded-md text-muted hover:bg-ground"
            >
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          {error.form && <Alert>{error.form}</Alert>}
          <Field label="Email" name="email" type="email" autoComplete="off" error={error.email} required autoFocus />
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-semibold">Role</legend>
            {OPTIONS.map((opt) => {
              const disabled = opt.role === "OWNER" && company.role !== "OWNER";
              return (
                <label
                  key={opt.role}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-md border bg-white px-3.5 py-3 hover:border-[#9aa09c]",
                    role === opt.role ? "border-ink" : "border-line",
                    disabled && "cursor-not-allowed bg-panel-head hover:border-line",
                  )}
                >
                  <input
                    type="radio"
                    name="role"
                    value={opt.role}
                    checked={role === opt.role}
                    disabled={disabled}
                    onChange={() => setRole(opt.role)}
                    className="mt-0.5 size-[18px] flex-none accent-ink"
                  />
                  <span className="flex flex-col gap-0.5">
                    <strong className={cn("text-[15px]", disabled && "text-subtle")}>{roleLabel(opt.role)}</strong>
                    <span className="text-[13px] leading-snug text-subtle">
                      {disabled ? "Only an Owner can invite another Owner" : opt.text}
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>
          <div className="flex flex-wrap justify-end gap-3">
            <Button onClick={close}>Cancel</Button>
            <Button type="submit" variant="primary" loading={loading}>
              Create invitation
            </Button>
          </div>
        </form>
      )}
    </dialog>
  );
}
