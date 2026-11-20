"use client";

import { useState } from "react";
import { api, ApiError, useApi, type Member } from "@/lib/api-client";
import {
  DEAL_STAGES,
  stageLabel,
  toDateInput,
  type ContactDetail,
  type ContactListItem,
  type Deal,
  type DealStage,
  type OrganizationDetail,
  type OrganizationListItem,
  type Paged,
} from "@/lib/crm-client";
import { Alert, Button, Field, SelectField, TextAreaField } from "@/components/ui";

// Create / edit forms for contacts, organizations and deals.
// Each form calls the API itself and gives the saved record to onSaved().

// ---------- Options for the <select>s ----------

function useMembers() {
  return useApi<{ members: Member[] }>("/api/members").data?.members ?? [];
}
function useOrganizations() {
  return useApi<Paged<"organizations", OrganizationListItem>>("/api/organizations?pageSize=100").data?.organizations ?? [];
}
function useContacts() {
  return useApi<Paged<"contacts", ContactListItem>>("/api/contacts?pageSize=100").data?.contacts ?? [];
}

// Reads a form field: "" becomes null so the API clears it
function read(form: FormData, key: string) {
  const value = String(form.get(key) ?? "").trim();
  return value === "" ? null : value;
}

function errorText(err: unknown) {
  return err instanceof ApiError ? err.message.replace(/"/g, "") : "Something went wrong. Try again.";
}

function FormActions({ saving, onCancel, label }: { saving: boolean; onCancel: () => void; label: string }) {
  return (
    <div className="flex flex-wrap justify-end gap-3 pt-1">
      <Button onClick={onCancel}>Cancel</Button>
      <Button type="submit" variant="primary" loading={saving}>
        {label}
      </Button>
    </div>
  );
}

// ---------- Contact ----------

export function ContactForm({
  contact,
  defaultOrganizationId,
  onSaved,
  onCancel,
}: {
  contact?: ContactDetail;
  defaultOrganizationId?: string;
  onSaved: (contact: ContactDetail | ContactListItem) => void;
  onCancel: () => void;
}) {
  const members = useMembers();
  const organizations = useOrganizations();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body = {
      name: read(form, "name") ?? "",
      type: String(form.get("type")),
      email: read(form, "email"),
      phone: read(form, "phone"),
      jobTitle: read(form, "jobTitle"),
      organizationId: read(form, "organizationId"),
      ownerId: read(form, "ownerId") ?? (contact ? null : undefined), // new: empty = me
      address: read(form, "address"),
      notes: read(form, "notes"),
    };
    if (!body.name) return setError("Enter the contact's name.");

    setSaving(true);
    setError("");
    try {
      const res = contact
        ? await api<{ contact: ContactDetail }>(`/api/contacts/${contact.id}`, { method: "PATCH", body })
        : await api<{ contact: ContactListItem }>("/api/contacts", { method: "POST", body });
      onSaved(res.contact);
    } catch (err) {
      setError(errorText(err));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-[18px]" noValidate>
      {error && <Alert>{error}</Alert>}
      <div className="grid grid-cols-1 gap-x-4 gap-y-[18px] sm:grid-cols-2">
        <Field label="Name" name="name" defaultValue={contact?.name} required autoFocus />
        <SelectField label="Type" name="type" defaultValue={contact?.type ?? "LEAD"}>
          <option value="LEAD">Lead</option>
          <option value="CLIENT">Client</option>
        </SelectField>
        <Field label="Email" name="email" type="email" defaultValue={contact?.email ?? ""} />
        <Field label="Phone" name="phone" type="tel" defaultValue={contact?.phone ?? ""} />
        <Field label="Job title" name="jobTitle" defaultValue={contact?.jobTitle ?? ""} />
        <SelectField
          key={organizations.length}
          label="Organization"
          name="organizationId"
          defaultValue={contact?.organization?.id ?? defaultOrganizationId ?? ""}
        >
          <option value="">None</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </SelectField>
        <SelectField key={members.length} label="Owner" name="ownerId" defaultValue={contact?.owner?.id ?? ""} hint={contact ? undefined : "Empty = you."}>
          <option value="">{contact ? "Nobody" : "Me"}</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </SelectField>
        <Field label="Address" name="address" defaultValue={contact?.address ?? ""} />
        <TextAreaField label="Notes" name="notes" rows={3} defaultValue={contact?.notes ?? ""} className="sm:col-span-2" />
      </div>
      <FormActions saving={saving} onCancel={onCancel} label={contact ? "Save contact" : "Add contact"} />
    </form>
  );
}

// ---------- Organization ----------

export function OrganizationForm({
  organization,
  onSaved,
  onCancel,
}: {
  organization?: OrganizationDetail;
  onSaved: (organization: { id: string }) => void;
  onCancel: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body = {
      name: read(form, "name") ?? "",
      website: read(form, "website"),
      industry: read(form, "industry"),
      phone: read(form, "phone"),
      address: read(form, "address"),
      notes: read(form, "notes"),
    };
    if (!body.name) return setError("Enter the organization's name.");

    setSaving(true);
    setError("");
    try {
      const res = organization
        ? await api<{ organization: { id: string } }>(`/api/organizations/${organization.id}`, { method: "PATCH", body })
        : await api<{ organization: { id: string } }>("/api/organizations", { method: "POST", body });
      onSaved(res.organization);
    } catch (err) {
      setError(errorText(err));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-[18px]" noValidate>
      {error && <Alert>{error}</Alert>}
      <div className="grid grid-cols-1 gap-x-4 gap-y-[18px] sm:grid-cols-2">
        <Field label="Name" name="name" defaultValue={organization?.name} required autoFocus className="sm:col-span-2" />
        <Field label="Website" name="website" defaultValue={organization?.website ?? ""} placeholder="example.com" />
        <Field label="Industry" name="industry" defaultValue={organization?.industry ?? ""} />
        <Field label="Phone" name="phone" type="tel" defaultValue={organization?.phone ?? ""} />
        <Field label="Address" name="address" defaultValue={organization?.address ?? ""} />
        <TextAreaField label="Notes" name="notes" rows={3} defaultValue={organization?.notes ?? ""} className="sm:col-span-2" />
      </div>
      <FormActions saving={saving} onCancel={onCancel} label={organization ? "Save organization" : "Add organization"} />
    </form>
  );
}

// ---------- Deal ----------

export function DealForm({
  deal,
  defaults,
  currency,
  onSaved,
  onCancel,
  extraActions,
}: {
  deal?: Deal;
  defaults?: { stage?: DealStage; contactId?: string; organizationId?: string };
  currency: string;
  onSaved: (deal: Deal) => void;
  onCancel: () => void;
  extraActions?: React.ReactNode;
}) {
  const members = useMembers();
  const organizations = useOrganizations();
  const contacts = useContacts();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      title: read(form, "title") ?? "",
      value: read(form, "value") ?? "0",
      contactId: read(form, "contactId"),
      organizationId: read(form, "organizationId"),
      ownerId: read(form, "ownerId") ?? (deal ? null : undefined), // new: empty = me
      expectedCloseDate: read(form, "expectedCloseDate"),
    };
    if (!deal) body.stage = String(form.get("stage"));
    if (!body.title) return setError("Give the deal a title.");

    setSaving(true);
    setError("");
    try {
      const res = deal
        ? await api<{ deal: Deal }>(`/api/deals/${deal.id}`, { method: "PATCH", body })
        : await api<{ deal: Deal }>("/api/deals", { method: "POST", body });
      onSaved(res.deal);
    } catch (err) {
      setError(errorText(err));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-[18px]" noValidate>
      {error && <Alert>{error}</Alert>}
      <div className="grid grid-cols-1 gap-x-4 gap-y-[18px] sm:grid-cols-2">
        <Field label="Title" name="title" defaultValue={deal?.title} required autoFocus className="sm:col-span-2" />
        <Field
          label={`Value (${currency})`}
          name="value"
          inputMode="decimal"
          defaultValue={deal ? String(Number(deal.value)) : ""}
          placeholder="0"
          hint="Numbers only, like 1500 or 1500.50"
        />
        {!deal && (
          <SelectField label="Stage" name="stage" defaultValue={defaults?.stage ?? "LEAD"}>
            {DEAL_STAGES.map((s) => (
              <option key={s} value={s}>
                {stageLabel(s)}
              </option>
            ))}
          </SelectField>
        )}
        <Field label="Expected close" name="expectedCloseDate" type="date" defaultValue={toDateInput(deal?.expectedCloseDate ?? null)} />
        <SelectField key={`c${contacts.length}`} label="Contact" name="contactId" defaultValue={deal?.contact?.id ?? defaults?.contactId ?? ""}>
          <option value="">None</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          key={`o${organizations.length}`}
          label="Organization"
          name="organizationId"
          defaultValue={deal?.organization?.id ?? defaults?.organizationId ?? ""}
        >
          <option value="">None</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </SelectField>
        <SelectField key={`m${members.length}`} label="Owner" name="ownerId" defaultValue={deal?.owner?.id ?? ""} hint={deal ? undefined : "Empty = you."}>
          <option value="">{deal ? "Nobody" : "Me"}</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>{extraActions}</div>
        <FormActions saving={saving} onCancel={onCancel} label={deal ? "Save deal" : "Add deal"} />
      </div>
    </form>
  );
}
