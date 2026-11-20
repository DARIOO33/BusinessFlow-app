"use client";

import { useState } from "react";
import { api, ApiError, formatDate, useApi } from "@/lib/api-client";
import { ACTIVITY_LABEL, ACTIVITY_TYPES, type Activity, type ActivityType, type DealSummary, type Paged } from "@/lib/crm-client";
import { hasRole } from "@/lib/roles";
import { useMe } from "@/components/me-provider";
import { Alert, Button, Panel, Skeleton, Tile } from "@/components/ui";
import { cn } from "@/lib/utils";

const ICON: Record<ActivityType, React.ReactNode> = {
  NOTE: <path d="M4 4h12l4 4v12H4zM15 4v5h5M8 13h8M8 17h5" />,
  CALL: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1" />,
  EMAIL: <path d="M3 6h18v12H3zM3 7l9 6 9-6" />,
  MEETING: <path d="M4 6h16v14H4zM4 10h16M9 3v5M15 3v5" />,
};

function TypeIcon({ type }: { type: ActivityType }) {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {ICON[type]}
    </svg>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// Notes / calls / emails / meetings logged on one contact, newest first.
export function ActivityLog({ contactId, deals }: { contactId: string; deals: DealSummary[] }) {
  const log = useApi<Paged<"activities", Activity>>(`/api/contacts/${contactId}/activities`);

  return (
    <Panel className="flex flex-col">
      <div className="flex items-baseline justify-between gap-3 px-5 pt-[18px] pb-3">
        <h2 className="text-lg font-semibold">Activity</h2>
        {log.data && <span className="text-[13px] text-subtle tabular-nums">{log.data.total} entries</span>}
      </div>
      <Composer contactId={contactId} deals={deals} onAdded={log.reload} />
      {log.error ? (
        <div className="p-5">
          <Alert>{log.error.message}</Alert>
        </div>
      ) : log.loading && !log.data ? (
        <div className="flex flex-col gap-3 p-5">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : log.data!.activities.length === 0 ? (
        <p className="border-t border-line-soft px-5 py-8 text-center text-[15px] text-muted">
          Nothing logged yet. Write the first note above: what was said, what&apos;s next.
        </p>
      ) : (
        <ol className="flex flex-col">
          {log.data!.activities.map((a) => (
            <ActivityItem key={a.id} activity={a} deals={deals} onChanged={log.reload} />
          ))}
        </ol>
      )}
    </Panel>
  );
}

function Composer({ contactId, deals, onAdded }: { contactId: string; deals: DealSummary[]; onAdded: () => void }) {
  const [type, setType] = useState<ActivityType>("NOTE");
  const [body, setBody] = useState("");
  const [date, setDate] = useState(today);
  const [dealId, setDealId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!body.trim()) return setError("Write something first.");
    setSaving(true);
    setError("");
    try {
      await api(`/api/contacts/${contactId}/activities`, {
        method: "POST",
        body: { type, body: body.trim(), occurredAt: date, dealId: dealId || null },
      });
      setBody("");
      setType("NOTE");
      onAdded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message.replace(/"/g, "") : "Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 border-t border-line-soft bg-panel-head px-5 py-4" noValidate>
      <div role="radiogroup" aria-label="Activity type" className="flex flex-wrap gap-1.5">
        {ACTIVITY_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={type === t}
            onClick={() => setType(t)}
            className={cn(
              "inline-flex min-h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-semibold",
              type === t ? "border-board bg-board text-flap" : "border-line-strong bg-white text-muted hover:text-ink",
            )}
          >
            <TypeIcon type={t} />
            {ACTIVITY_LABEL[t]}
          </button>
        ))}
      </div>
      <label htmlFor="activity-body" className="sr-only">
        {ACTIVITY_LABEL[type]} details
      </label>
      <textarea
        id="activity-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder={type === "NOTE" ? "Write a note…" : `What happened in this ${ACTIVITY_LABEL[type].toLowerCase()}?`}
        className="w-full resize-y rounded-md border border-line-strong bg-white px-3 py-2.5 text-[15px] hover:border-[#9aa09c] focus:border-ink focus:ring-[3px] focus:ring-signal/45 focus:outline-none"
      />
      {error && <Alert>{error}</Alert>}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="activity-date" className="text-[13px] font-semibold">
              Date
            </label>
            <input
              id="activity-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="min-h-10 rounded-md border border-line-strong bg-white px-2.5 text-sm"
            />
          </div>
          {deals.length > 0 && (
            <div className="flex flex-col gap-1">
              <label htmlFor="activity-deal" className="text-[13px] font-semibold">
                About deal
              </label>
              <select
                id="activity-deal"
                value={dealId}
                onChange={(e) => setDealId(e.target.value)}
                className="min-h-10 max-w-[220px] rounded-md border border-line-strong bg-white px-2.5 text-sm"
              >
                <option value="">None</option>
                {deals.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <Button type="submit" variant="primary" loading={saving}>
          Log {ACTIVITY_LABEL[type].toLowerCase()}
        </Button>
      </div>
    </form>
  );
}

function ActivityItem({ activity, deals, onChanged }: { activity: Activity; deals: DealSummary[]; onChanged: () => void }) {
  const { me, company } = useMe();
  const canEdit = activity.author?.id === me.user.id || hasRole(company.role, "ADMIN");
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(activity.body);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  const save = () =>
    run(async () => {
      await api(`/api/activities/${activity.id}`, { method: "PATCH", body: { body: text.trim() } });
      setEditing(false);
      setBusy(false);
    });

  const remove = () => run(() => api(`/api/activities/${activity.id}`, { method: "DELETE" }));

  const dealTitle = activity.deal?.title ?? deals.find((d) => d.id === activity.deal?.id)?.title;

  return (
    <li className="flex gap-3.5 border-t border-line-soft px-5 py-4">
      <span aria-hidden="true" className="mt-0.5 flex size-9 flex-none items-center justify-center rounded-md bg-board text-flap">
        <TypeIcon type={activity.type} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-subtle">
          <Tile tone={activity.type === "NOTE" ? "dim" : "default"}>{ACTIVITY_LABEL[activity.type]}</Tile>
          <span className="font-semibold text-ink">{activity.author?.name ?? "Former member"}</span>
          <time dateTime={activity.occurredAt} className="tabular-nums">
            {formatDate(activity.occurredAt)}
          </time>
          {dealTitle && <span>· about {dealTitle}</span>}
        </div>
        {editing ? (
          <div className="flex flex-col gap-2">
            <label htmlFor={`edit-${activity.id}`} className="sr-only">
              Edit text
            </label>
            <textarea
              id={`edit-${activity.id}`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              autoFocus
              className="w-full resize-y rounded-md border border-line-strong bg-white px-3 py-2.5 text-[15px] focus:border-ink focus:ring-[3px] focus:ring-signal/45 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" onClick={() => {
                  setEditing(false);
                  setText(activity.body);
                }}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" loading={busy} disabled={!text.trim()} onClick={save}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-[15px] leading-relaxed whitespace-pre-line">{activity.body}</p>
        )}
        {error && <Alert>{error}</Alert>}
      </div>
      {canEdit && !editing && (
        <div className="flex flex-none items-start gap-1.5">
          {confirmDelete ? (
            <>
              <Button size="sm" onClick={() => setConfirmDelete(false)} disabled={busy}>
                Keep
              </Button>
              <Button size="sm" variant="danger" loading={busy} onClick={remove} autoFocus>
                Delete
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" onClick={() => setEditing(true)} aria-label="Edit entry">
                Edit
              </Button>
              <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)} aria-label="Delete entry">
                Delete
              </Button>
            </>
          )}
        </div>
      )}
    </li>
  );
}
