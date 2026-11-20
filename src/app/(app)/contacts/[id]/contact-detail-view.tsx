"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError, initials, useApi } from "@/lib/api-client";
import { useCurrency, type ContactDetail } from "@/lib/crm-client";
import { hasRole } from "@/lib/roles";
import { useMe } from "@/components/me-provider";
import { ActivityLog } from "@/components/crm/activity-log";
import { DealList } from "@/components/crm/deal-list";
import { ContactForm, DealForm } from "@/components/crm/forms";
import { Modal } from "@/components/modal";
import { Alert, Avatar, Button, ButtonLink, Panel, Skeleton, Tile } from "@/components/ui";

export function ContactDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { company } = useMe();
  const currency = useCurrency();
  const contact = useApi<{ contact: ContactDetail }>(`/api/contacts/${id}`);
  const [editing, setEditing] = useState(false);
  const [addingDeal, setAddingDeal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  if (contact.error) {
    return (
      <div className="flex flex-col items-start gap-4">
        <Alert>{contact.error.status === 404 ? "This contact doesn't exist or was deleted." : contact.error.message}</Alert>
        <ButtonLink href="/contacts">Back to contacts</ButtonLink>
      </div>
    );
  }
  if (!contact.data) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  const c = contact.data.contact;
  const canDelete = hasRole(company.role, "ADMIN");

  async function onDelete() {
    setDeleting(true);
    setError("");
    try {
      await api(`/api/contacts/${id}`, { method: "DELETE" });
      router.push("/contacts");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete. Try again.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/contacts" className="underline-offset-[3px] hover:underline">
          Contacts
        </Link>{" "}
        / <span className="text-ink">{c.name}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span aria-hidden="true" className="flex size-14 flex-none items-center justify-center rounded-md bg-board font-cond text-xl font-semibold text-signal">
            {initials(c.name)}
          </span>
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[28px] leading-tight font-bold tracking-[-0.01em]">{c.name}</h1>
              <Tile tone={c.type === "CLIENT" ? "live" : "dim"}>{c.type === "CLIENT" ? "Client" : "Lead"}</Tile>
            </div>
            <p className="text-[15px] text-muted">
              {c.jobTitle ?? "No job title"}
              {c.organization && (
                <>
                  {" at "}
                  <Link href={`/organizations/${c.organization.id}`} className="font-semibold text-ink underline underline-offset-[3px]">
                    {c.organization.name}
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setEditing(true)}>Edit</Button>
          {canDelete &&
            (confirmDelete ? (
              <>
                <Button onClick={() => setConfirmDelete(false)} disabled={deleting}>
                  Keep
                </Button>
                <Button variant="danger" loading={deleting} onClick={onDelete} autoFocus>
                  Delete {c.name.split(" ")[0]}
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

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <ActivityLog contactId={c.id} deals={c.deals} />

        <div className="flex flex-col gap-6">
          <Panel className="flex flex-col gap-0">
            <h2 className="px-5 pt-[18px] pb-3 text-lg font-semibold">Details</h2>
            <dl className="flex flex-col">
              <Detail label="Email" value={c.email && <a href={`mailto:${c.email}`} className="text-ink underline underline-offset-[3px]">{c.email}</a>} />
              <Detail label="Phone" value={c.phone && <a href={`tel:${c.phone}`} className="text-ink underline underline-offset-[3px]">{c.phone}</a>} />
              <Detail
                label="Owner"
                value={
                  c.owner && (
                    <span className="flex items-center gap-2">
                      <Avatar text={initials(c.owner.name)} />
                      {c.owner.name}
                    </span>
                  )
                }
              />
              <Detail label="Address" value={c.address} />
              <Detail label="Notes" value={c.notes && <span className="whitespace-pre-line">{c.notes}</span>} />
            </dl>
          </Panel>

          <Panel>
            <div className="flex items-center justify-between gap-3 px-5 pt-[18px] pb-3">
              <h2 className="text-lg font-semibold">Deals</h2>
              <Button size="sm" onClick={() => setAddingDeal(true)}>
                New deal
              </Button>
            </div>
            <DealList deals={c.deals} currency={currency} />
          </Panel>
        </div>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title={`Edit ${c.name}`} wide>
        <ContactForm
          contact={c}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            contact.reload();
          }}
        />
      </Modal>

      <Modal open={addingDeal} onClose={() => setAddingDeal(false)} title="New deal" wide>
        <DealForm
          currency={currency}
          defaults={{ contactId: c.id, organizationId: c.organization?.id }}
          onCancel={() => setAddingDeal(false)}
          onSaved={() => {
            setAddingDeal(false);
            contact.reload();
          }}
        />
      </Modal>
    </>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-t border-line-soft px-5 py-3">
      <dt className="font-cond text-[13px] font-semibold tracking-[0.08em] text-subtle uppercase">{label}</dt>
      <dd className="text-[15px]">{value || <span className="text-subtle">Not set</span>}</dd>
    </div>
  );
}
