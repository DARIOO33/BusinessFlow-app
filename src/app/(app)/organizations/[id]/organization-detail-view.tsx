"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError, initials, useApi } from "@/lib/api-client";
import { formatMoney, useCurrency, type OrganizationDetail } from "@/lib/crm-client";
import { hasRole } from "@/lib/roles";
import { useMe } from "@/components/me-provider";
import { DealList } from "@/components/crm/deal-list";
import { ContactForm, DealForm, OrganizationForm } from "@/components/crm/forms";
import { Modal } from "@/components/modal";
import { Alert, Avatar, Button, ButtonLink, Panel, Skeleton, Tile } from "@/components/ui";

export function OrganizationDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { company } = useMe();
  const currency = useCurrency();
  const org = useApi<{ organization: OrganizationDetail; openDealsValue: string }>(`/api/organizations/${id}`);
  const [modal, setModal] = useState<"edit" | "contact" | "deal" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  if (org.error) {
    return (
      <div className="flex flex-col items-start gap-4">
        <Alert>{org.error.status === 404 ? "This organization doesn't exist or was deleted." : org.error.message}</Alert>
        <ButtonLink href="/organizations">Back to organizations</ButtonLink>
      </div>
    );
  }
  if (!org.data) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  const o = org.data.organization;
  const close = () => setModal(null);
  const saved = () => {
    setModal(null);
    org.reload();
  };

  async function onDelete() {
    setDeleting(true);
    setError("");
    try {
      await api(`/api/organizations/${id}`, { method: "DELETE" });
      router.push("/organizations");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete. Try again.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/organizations" className="underline-offset-[3px] hover:underline">
          Organizations
        </Link>{" "}
        / <span className="text-ink">{o.name}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span aria-hidden="true" className="flex size-14 flex-none items-center justify-center rounded-md bg-board font-cond text-xl font-semibold text-flap">
            {initials(o.name)}
          </span>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[28px] leading-tight font-bold tracking-[-0.01em]">{o.name}</h1>
            <p className="text-[15px] text-muted">{[o.industry, o.website].filter(Boolean).join(" · ") || "No industry or website yet"}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setModal("edit")}>Edit</Button>
          {hasRole(company.role, "ADMIN") &&
            (confirmDelete ? (
              <>
                <Button onClick={() => setConfirmDelete(false)} disabled={deleting}>
                  Keep
                </Button>
                <Button variant="danger" loading={deleting} onClick={onDelete} autoFocus>
                  Delete {o.name}
                </Button>
              </>
            ) : (
              <Button variant="danger" className="ml-4" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            ))}
        </div>
      </div>
      {error && <Alert>{error}</Alert>}
      {confirmDelete && <p className="text-sm text-muted">Its contacts and deals are kept, without an organization.</p>}

      <div className="on-board flex flex-wrap gap-[3px] rounded-lg bg-board p-[3px] text-flap">
        <Stat label="Contacts" value={String(o.contacts.length)} />
        <Stat label="Deals" value={String(o.deals.length)} />
        <Stat label="Open pipeline" value={formatMoney(org.data.openDealsValue, currency)} live />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <Panel>
          <div className="flex items-center justify-between gap-3 px-5 pt-[18px] pb-3">
            <h2 className="text-lg font-semibold">People</h2>
            <Button size="sm" onClick={() => setModal("contact")}>
              Add contact
            </Button>
          </div>
          {o.contacts.length === 0 ? (
            <p className="px-5 pb-5 text-[15px] text-muted">Nobody here yet.</p>
          ) : (
            <ul className="flex flex-col">
              {o.contacts.map((c) => (
                <li key={c.id} className="flex items-center gap-3 border-t border-line-soft px-5 py-3">
                  <Avatar text={initials(c.name)} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/contacts/${c.id}`} className="font-semibold text-ink underline-offset-[3px] hover:underline">
                      {c.name}
                    </Link>
                    <div className="truncate text-[13px] text-subtle">{[c.jobTitle, c.email].filter(Boolean).join(" · ")}</div>
                  </div>
                  <Tile tone={c.type === "CLIENT" ? "live" : "dim"}>{c.type === "CLIENT" ? "Client" : "Lead"}</Tile>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel>
            <div className="flex items-center justify-between gap-3 px-5 pt-[18px] pb-3">
              <h2 className="text-lg font-semibold">Deals</h2>
              <Button size="sm" onClick={() => setModal("deal")}>
                New deal
              </Button>
            </div>
            <DealList deals={o.deals} currency={currency} />
          </Panel>
          <Panel className="flex flex-col gap-2 p-5">
            <h2 className="text-lg font-semibold">Details</h2>
            <p className="text-[15px] text-muted">
              {o.phone ?? "No phone"} · {o.address ?? "No address"}
            </p>
            {o.notes && <p className="text-[15px] leading-relaxed whitespace-pre-line">{o.notes}</p>}
          </Panel>
        </div>
      </div>

      <Modal open={modal === "edit"} onClose={close} title={`Edit ${o.name}`} wide>
        <OrganizationForm organization={o} onCancel={close} onSaved={saved} />
      </Modal>
      <Modal open={modal === "contact"} onClose={close} title={`New contact at ${o.name}`} wide>
        <ContactForm defaultOrganizationId={o.id} onCancel={close} onSaved={saved} />
      </Modal>
      <Modal open={modal === "deal"} onClose={close} title={`New deal with ${o.name}`} wide>
        <DealForm currency={currency} defaults={{ organizationId: o.id }} onCancel={close} onSaved={saved} />
      </Modal>
    </>
  );
}

function Stat({ label, value, live = false }: { label: string; value: string; live?: boolean }) {
  return (
    <div className="flex min-w-[140px] flex-1 flex-col gap-1.5 rounded bg-tile px-4 py-3">
      <span className="font-cond text-[13px] font-semibold tracking-[0.08em] text-board-muted uppercase">{label}</span>
      <span className={live ? "text-xl font-semibold text-signal tabular-nums" : "text-xl font-semibold tabular-nums"}>{value}</span>
    </div>
  );
}
