"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError, formatDate, initials, useApi, type Invitation, type Member } from "@/lib/api-client";
import { hasRole, ROLE_INFO, ROLES, roleLabel, type Role } from "@/lib/roles";
import { useMe } from "@/components/me-provider";
import { Alert, Avatar, Button, PageHeader, Panel, Skeleton, Tile } from "@/components/ui";
import { InviteDialog } from "./invite-dialog";
import { LinkBox } from "./link-box";

const TH = "bg-panel-head px-5 py-2.5 text-left font-cond text-[13px] font-semibold tracking-[0.08em] text-subtle uppercase";
const TD = "border-t border-line-soft px-5 py-3 align-middle";

function roleTone(role: Role) {
  return role === "OWNER" ? "live" : role === "ADMIN" ? "default" : "dim";
}

export function TeamView({ openInvite }: { openInvite: boolean }) {
  const { company } = useMe();
  const members = useApi<{ members: Member[] }>("/api/members");
  const isAdmin = hasRole(company.role, "ADMIN");
  const [inviteOpen, setInviteOpen] = useState(openInvite && isAdmin);
  const [invitesVersion, setInvitesVersion] = useState(0);

  const count = members.data?.members.length;

  return (
    <>
      <PageHeader
        title="Team"
        subtitle={count !== undefined ? `${count} ${count === 1 ? "member" : "members"} in ${company.name}` : company.name}
        action={
          isAdmin && (
            <Button variant="primary" onClick={() => setInviteOpen(true)}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Invite member
            </Button>
          )
        }
      />

      <MembersPanel state={members} />
      {isAdmin && <InvitationsPanel key={invitesVersion} />}
      <RolesGuide />

      {isAdmin && (
        <InviteDialog
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          onCreated={() => setInvitesVersion((v) => v + 1)}
        />
      )}
    </>
  );
}

// ---------- Members ----------

function MembersPanel({ state }: { state: ReturnType<typeof useApi<{ members: Member[] }>> }) {
  const router = useRouter();
  const { me, company, refresh } = useMe();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const list = state.data?.members ?? [];
  const owners = list.filter((m) => m.role === "OWNER").length;
  const myRole = company.role;

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(null);
      setConfirming(null);
    }
  }

  const changeRole = (m: Member, role: Role) =>
    run(`role-${m.id}`, async () => {
      await api(`/api/members/${m.id}`, { method: "PATCH", body: { role } });
      state.reload();
    });

  const remove = (m: Member) =>
    run(`remove-${m.id}`, async () => {
      await api(`/api/members/${m.id}`, { method: "DELETE" });
      state.reload();
    });

  const leave = () =>
    run("leave", async () => {
      await api("/api/members/me", { method: "DELETE" });
      const next = await refresh(); // switches to another company or goes to /onboarding
      if (next.activeCompany) router.push("/dashboard");
    });

  function canRemove(m: Member) {
    if (m.id === me.user.id) return false;
    if (myRole === "OWNER") return true;
    return myRole === "ADMIN" && m.role === "MEMBER";
  }

  return (
    <Panel className="overflow-hidden">
      <div className="px-5 py-[18px]">
        <h2 className="text-lg font-semibold">Members</h2>
      </div>
      {error && (
        <div className="px-5 pb-4">
          <Alert>{error}</Alert>
        </div>
      )}
      {state.loading ? (
        <div className="flex flex-col gap-3 px-5 pb-5">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : state.error ? (
        <div className="px-5 pb-5">
          <Alert>{state.error.message}</Alert>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-[15px]">
            <thead>
              <tr>
                <th scope="col" className={TH}>Name</th>
                <th scope="col" className={TH}>Role</th>
                <th scope="col" className={TH}>Joined</th>
                <th scope="col" className={TH}><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => {
                const isMe = m.id === me.user.id;
                const lastOwner = m.role === "OWNER" && owners === 1;
                return (
                  <tr key={m.id} className="hover:bg-[#fafaf8]">
                    <td className={TD}>
                      <div className="flex items-center gap-3">
                        <Avatar text={initials(m.name)} />
                        <div className="min-w-0">
                          <div className="font-semibold">
                            {m.name} {isMe && <span className="font-normal text-subtle">(you)</span>}
                          </div>
                          <div className="truncate text-[13px] text-subtle">{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className={TD}>
                      <div className="flex items-center gap-2.5">
                        <span aria-live="polite">
                          <Tile tone={roleTone(m.role)}>{roleLabel(m.role)}</Tile>
                        </span>
                        {myRole === "OWNER" && !(isMe && lastOwner) && (
                          <>
                            <label htmlFor={`role-${m.id}`} className="sr-only">
                              Change role for {m.name}
                            </label>
                            <select
                              id={`role-${m.id}`}
                              value={m.role}
                              disabled={busy !== null}
                              onChange={(e) => changeRole(m, e.target.value as Role)}
                              className="min-h-9 cursor-pointer rounded-md border border-line-strong bg-white px-2 text-sm hover:border-[#9aa09c] disabled:cursor-wait"
                            >
                              {ROLES.map((r) => (
                                <option key={r} value={r}>
                                  {roleLabel(r)}
                                </option>
                              ))}
                            </select>
                          </>
                        )}
                      </div>
                    </td>
                    <td className={`${TD} whitespace-nowrap text-muted tabular-nums`}>{formatDate(m.joinedAt)}</td>
                    <td className={`${TD} pl-10 text-right`}>
                      {isMe ? (
                        lastOwner ? (
                          <span className="text-[13px] text-subtle">Last owner, can&apos;t leave</span>
                        ) : confirming === "leave" ? (
                          <ConfirmPair label="Leave company" loading={busy === "leave"} onConfirm={leave} onCancel={() => setConfirming(null)} />
                        ) : (
                          <Button size="sm" variant="danger" onClick={() => setConfirming("leave")}>
                            Leave
                          </Button>
                        )
                      ) : canRemove(m) ? (
                        confirming === m.id ? (
                          <ConfirmPair label={`Remove ${m.name.split(" ")[0]}`} loading={busy === `remove-${m.id}`} onConfirm={() => remove(m)} onCancel={() => setConfirming(null)} />
                        ) : (
                          <Button size="sm" variant="danger" onClick={() => setConfirming(m.id)}>
                            Remove
                          </Button>
                        )
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

// Two-step destructive action: no modal, the row asks for confirmation in place
function ConfirmPair({
  label,
  loading,
  onConfirm,
  onCancel,
}: {
  label: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex justify-end gap-2">
      <Button size="sm" onClick={onCancel} disabled={loading}>
        Keep
      </Button>
      <Button size="sm" variant="danger" loading={loading} onClick={onConfirm} autoFocus>
        {label}
      </Button>
    </div>
  );
}

// ---------- Invitations (ADMIN+) ----------

function InvitationsPanel() {
  const invitations = useApi<{ invitations: Invitation[] }>("/api/invitations");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [link, setLink] = useState<{ email: string; url: string } | null>(null);

  const list = invitations.data?.invitations ?? [];

  async function newLink(inv: Invitation) {
    setBusy(`link-${inv.id}`);
    setError("");
    try {
      const res = await api<{ inviteLink: string }>("/api/invitations", {
        method: "POST",
        body: { email: inv.email, role: inv.role },
      });
      setLink({ email: inv.email, url: res.inviteLink });
      invitations.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create a new link.");
    } finally {
      setBusy(null);
    }
  }

  async function cancel(inv: Invitation) {
    setBusy(`cancel-${inv.id}`);
    setError("");
    try {
      await api(`/api/invitations/${inv.id}`, { method: "DELETE" });
      if (link?.email === inv.email) setLink(null);
      invitations.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't cancel the invitation.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-3 px-5 py-[18px]">
        <h2 className="text-lg font-semibold">Pending invitations</h2>
        <span className="text-[13px] text-subtle">Visible to admins and owners</span>
      </div>
      {(error || link) && (
        <div className="flex flex-col gap-3 px-5 pb-4">
          {error && <Alert>{error}</Alert>}
          {link && <LinkBox email={link.email} url={link.url} />}
        </div>
      )}
      {invitations.loading ? (
        <div className="px-5 pb-5">
          <Skeleton className="h-12" />
        </div>
      ) : invitations.error ? (
        <div className="px-5 pb-5">
          <Alert>{invitations.error.message}</Alert>
        </div>
      ) : list.length === 0 ? (
        <p className="border-t border-line-soft px-5 py-5 text-[15px] text-muted">
          No pending invitations. Use <strong>Invite member</strong> to add someone.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-[15px]">
            <thead>
              <tr>
                <th scope="col" className={TH}>Email</th>
                <th scope="col" className={TH}>Role</th>
                <th scope="col" className={TH}>Expires</th>
                <th scope="col" className={TH}><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {list.map((inv) => (
                <tr key={inv.id} className="hover:bg-[#fafaf8]">
                  <td className={`${TD} font-semibold`}>{inv.email}</td>
                  <td className={TD}>
                    <Tile tone={roleTone(inv.role)}>{roleLabel(inv.role)}</Tile>
                  </td>
                  <td className={`${TD} whitespace-nowrap text-muted tabular-nums`}>
                    {inv.expired ? <Tile tone="alarm">Expired</Tile> : formatDate(inv.expiresAt)}
                  </td>
                  <td className={TD}>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" loading={busy === `link-${inv.id}`} disabled={busy !== null} onClick={() => newLink(inv)}>
                        New link
                      </Button>
                      <Button size="sm" variant="danger" className="ml-4" loading={busy === `cancel-${inv.id}`} disabled={busy !== null} onClick={() => cancel(inv)}>
                        Cancel
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

// ---------- Roles guide ----------

function RolesGuide() {
  return (
    <section aria-labelledby="roles-guide" className="flex flex-col gap-3">
      <h2 id="roles-guide" className="text-lg font-semibold">
        What each role can do
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {ROLES.map((role) => (
          <div key={role} className="flex flex-col gap-2 rounded-lg border border-line bg-white p-4">
            <Tile tone={role === "OWNER" ? "live" : "default"} className="self-start">
              {roleLabel(role)}
            </Tile>
            <p className="text-sm leading-snug text-muted">{ROLE_INFO[role]}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
