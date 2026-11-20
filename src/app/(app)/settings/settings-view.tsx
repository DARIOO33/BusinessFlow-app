"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError, daysUntil, formatDate, useApi, type Company } from "@/lib/api-client";
import { hasRole } from "@/lib/roles";
import { useMe } from "@/components/me-provider";
import { Alert, Button, Field, PageHeader, Panel, SelectField, Skeleton, TextAreaField, Tile } from "@/components/ui";

const CURRENCIES = [
  ["USD", "US dollar"],
  ["EUR", "Euro"],
  ["GBP", "Pound sterling"],
  ["CAD", "Canadian dollar"],
  ["AUD", "Australian dollar"],
] as const;

export function SettingsView() {
  const { company: active } = useMe();
  const current = useApi<{ company: Company }>("/api/companies/current");

  return (
    <>
      <PageHeader title="Settings" subtitle={`These details are printed on every invoice ${active.name} sends.`} />
      {current.error && <Alert>{current.error.message}</Alert>}
      {current.loading || !current.data ? (
        <Skeleton className="h-[520px] w-full" />
      ) : (
        <>
          <ProfileForm company={current.data.company} canEdit={hasRole(active.role, "ADMIN")} onSaved={current.reload} />
          <PlanPanel company={current.data.company} />
          {active.role === "OWNER" && <DeleteCompany name={current.data.company.name} />}
        </>
      )}
    </>
  );
}

function ProfileForm({ company, canEdit, onSaved }: { company: Company; canEdit: boolean; onSaved: () => void }) {
  const { refresh } = useMe();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const value = (key: string) => String(form.get(key) ?? "").trim() || null;

    setSaving(true);
    setMessage(null);
    try {
      await api("/api/companies/current", {
        method: "PATCH",
        body: {
          name: value("name") ?? "",
          email: value("email"),
          phone: value("phone"),
          address: value("address"),
          taxId: value("taxId"),
          logoUrl: value("logoUrl"),
          currency: String(form.get("currency")),
        },
      });
      setMessage({ tone: "success", text: "Saved." });
      onSaved();
      await refresh(); // the sidebar shows the company name
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof ApiError ? err.message.replace(/"/g, "") : "Couldn't save. Try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel className="p-6">
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Company profile</h2>
          <span className="text-[13px] text-subtle">
            {canEdit ? "Admins and owners can edit." : "Read-only: only admins and owners can edit."}
          </span>
        </div>
        {message && <Alert tone={message.tone}>{message.text}</Alert>}
        <fieldset disabled={!canEdit} className="contents">
          <div className="grid grid-cols-1 gap-x-4 gap-y-[18px] sm:grid-cols-2">
            <Field label="Company name" name="name" defaultValue={company.name} required />
            <Field label="Billing email" name="email" type="email" defaultValue={company.email ?? ""} />
            <Field label="Phone" name="phone" type="tel" defaultValue={company.phone ?? ""} />
            <Field label="Tax ID" name="taxId" defaultValue={company.taxId ?? ""} />
            <TextAreaField label="Address" name="address" defaultValue={company.address ?? ""} className="sm:col-span-2" />
            <Field label="Logo URL" name="logoUrl" type="url" defaultValue={company.logoUrl ?? ""} className="sm:col-span-2" />
            <SelectField label="Currency" name="currency" defaultValue={company.currency}>
              {CURRENCIES.map(([code, name]) => (
                <option key={code} value={code}>
                  {code} · {name}
                </option>
              ))}
              {!CURRENCIES.some(([code]) => code === company.currency) && (
                <option value={company.currency}>{company.currency}</option>
              )}
            </SelectField>
            <Field
              label="Workspace address"
              value={`businessflow.app/${company.slug}`}
              readOnly
              hint="Can't be changed yet."
            />
          </div>
          {canEdit && (
            <div className="flex flex-wrap justify-end gap-3 pt-1">
              <Button type="reset">Discard</Button>
              <Button type="submit" variant="primary" loading={saving}>
                Save changes
              </Button>
            </div>
          )}
        </fieldset>
      </form>
    </Panel>
  );
}

function PlanPanel({ company }: { company: Company }) {
  const trialing = company.subscriptionStatus === "TRIALING" && company.trialEndsAt;
  return (
    <Panel className="flex flex-col gap-5 p-6">
      <h2 className="text-lg font-semibold">Plan</h2>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Tile tone="live">{company.plan}</Tile>
          {trialing && (
            <>
              <Tile>{`Trial · ${daysUntil(company.trialEndsAt!)} days left`}</Tile>
              <span className="text-sm text-muted">Ends {formatDate(company.trialEndsAt!)}</span>
            </>
          )}
        </div>
        <Button disabled>Change plan (coming soon)</Button>
      </div>
    </Panel>
  );
}

function DeleteCompany({ name }: { name: string }) {
  const router = useRouter();
  const { refresh } = useMe();
  const [typed, setTyped] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onDelete() {
    setLoading(true);
    setError("");
    try {
      await api("/api/companies/current", { method: "DELETE" });
      // Switches to another company, or sends you to /onboarding if none is left
      const me = await refresh();
      if (me.activeCompany) router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete. Try again.");
      setLoading(false);
    }
  }

  return (
    <section aria-labelledby="delete-company" className="mt-6 flex flex-col gap-[18px] rounded-lg border border-danger-line bg-white p-6">
      <div className="flex flex-col gap-1.5">
        <h2 id="delete-company" className="text-lg font-semibold text-danger">
          Delete this company
        </h2>
        <p className="max-w-[62ch] text-[15px] leading-relaxed text-muted">
          Removes {name} with all its contacts, projects, invoices and members. Nobody can undo this.
        </p>
      </div>
      {error && <Alert>{error}</Alert>}
      <div className="flex flex-wrap items-end gap-8">
        <Field
          label={
            <>
              Type <strong>{name}</strong> to confirm
            </>
          }
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          className="flex-[1_1_260px]"
        />
        <Button variant="danger" disabled={typed !== name} loading={loading} onClick={onDelete}>
          Delete company
        </Button>
      </div>
    </section>
  );
}
