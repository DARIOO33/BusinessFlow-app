"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useRef, useState } from "react";
import { api, ApiError, formatDate, initials, useApi, type Member } from "@/lib/api-client";
import { DEAL_STAGES, formatMoney, stageLabel, useDebounced, type Board, type Deal, type DealStage } from "@/lib/crm-client";
import { hasRole } from "@/lib/roles";
import { useMe } from "@/components/me-provider";
import { DealForm } from "@/components/crm/forms";
import { SearchBox } from "@/components/crm/list-bits";
import { Modal } from "@/components/modal";
import { Alert, Avatar, Button, PageHeader, Skeleton, Tile } from "@/components/ui";
import { cn } from "@/lib/utils";

type Columns = Record<DealStage, Deal[]>;

function toColumns(board: Board): Columns {
  return Object.fromEntries(board.stages.map((s) => [s.stage, s.deals])) as Columns;
}

const sum = (deals: Deal[]) => deals.reduce((total, d) => total + Number(d.value), 0);

export function DealsBoard({ openDealId }: { openDealId: string | null }) {
  const { company } = useMe();
  const [search, setSearch] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const q = useDebounced(search);
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (ownerId) query.set("ownerId", ownerId);
  const board = useApi<Board>(`/api/deals?${query}`);
  const members = useApi<{ members: Member[] }>("/api/members").data?.members ?? [];

  // Local copy of the columns, so cards move instantly while dragging.
  // Reset whenever fresh data arrives ("store the previous value" pattern).
  const [columns, setColumns] = useState<Columns | null>(null);
  const [source, setSource] = useState<Board | undefined>(undefined);
  if (board.data !== source) {
    setSource(board.data);
    setColumns(board.data ? toColumns(board.data) : null);
  }

  const [activeId, setActiveId] = useState<string | null>(null);
  const dragStart = useRef<{ stage: DealStage; index: number } | null>(null);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(openDealId);
  const [creatingIn, setCreatingIn] = useState<DealStage | null>(null);
  const [today] = useState(() => new Date().toISOString().slice(0, 10)); // "2026-11-20", for overdue dates

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }), // a short click still opens the card
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }), // long-press on phones, so scrolling works
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space", "Enter"] },
    }),
  );

  const currency = board.data?.currency ?? "USD";
  const allDeals = columns ? DEAL_STAGES.flatMap((s) => columns[s]) : [];
  const activeDeal = allDeals.find((d) => d.id === activeId) ?? null;
  const editingDeal = allDeals.find((d) => d.id === editingId) ?? null;

  function stageOf(id: string): DealStage | undefined {
    if (!columns) return undefined;
    if ((DEAL_STAGES as readonly string[]).includes(id)) return id as DealStage;
    return DEAL_STAGES.find((s) => columns[s].some((d) => d.id === id));
  }

  function onDragStart({ active }: DragStartEvent) {
    const stage = stageOf(String(active.id));
    if (!stage || !columns) return;
    dragStart.current = { stage, index: columns[stage].findIndex((d) => d.id === active.id) };
    setActiveId(String(active.id));
    setError("");
  }

  // Moving over another column: move the card there right away
  function onDragOver({ active, over }: DragOverEvent) {
    if (!over || !columns) return;
    const from = stageOf(String(active.id));
    const to = stageOf(String(over.id));
    if (!from || !to || from === to) return;

    const fromList = [...columns[from]];
    const toList = [...columns[to]];
    const [moved] = fromList.splice(fromList.findIndex((d) => d.id === active.id), 1);
    const overIndex = toList.findIndex((d) => d.id === over.id);
    toList.splice(overIndex >= 0 ? overIndex : toList.length, 0, { ...moved, stage: to });
    setColumns({ ...columns, [from]: fromList, [to]: toList });
  }

  async function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    const start = dragStart.current;
    dragStart.current = null;
    if (!columns || !start) return;
    if (!over) {
      setColumns(board.data ? toColumns(board.data) : null); // dropped outside: undo
      return;
    }

    const id = String(active.id);
    const stage = stageOf(id)!;
    let list = columns[stage];
    const oldIndex = list.findIndex((d) => d.id === id);
    const newIndex = over.id === stage ? list.length - 1 : list.findIndex((d) => d.id === over.id);
    if (newIndex >= 0 && oldIndex !== newIndex) {
      list = arrayMove(list, oldIndex, newIndex);
      setColumns({ ...columns, [stage]: list });
    }
    const index = list.findIndex((d) => d.id === id);
    if (start.stage === stage && start.index === index) return;

    try {
      await api(`/api/deals/${id}/move`, { method: "POST", body: { stage, index } });
    } catch (err) {
      setError(err instanceof ApiError ? `Couldn't move the deal: ${err.message}` : "Couldn't move the deal. Try again.");
    }
    board.reload(); // closedAt, positions and totals from the server
  }

  const openTotal = columns ? sum(DEAL_STAGES.filter((s) => s !== "WON" && s !== "LOST").flatMap((s) => columns[s])) : 0;
  const wonTotal = columns ? sum(columns.WON) : 0;

  return (
    <>
      <PageHeader
        title="Deals"
        subtitle="Drag a card to move it through the pipeline."
        action={
          <Button variant="primary" onClick={() => setCreatingIn("LEAD")}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New deal
          </Button>
        }
      />

      <div className="on-board flex flex-wrap gap-[3px] rounded-lg bg-board p-[3px] text-flap">
        <Stat label="Open pipeline" value={formatMoney(openTotal, currency)} live />
        <Stat label="Won" value={formatMoney(wonTotal, currency)} />
        <Stat label="Deals" value={String(allDeals.length)} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchBox label="Search deal, contact or organization" value={search} onChange={setSearch} />
        <label htmlFor="owner-filter" className="sr-only">
          Owner
        </label>
        <select
          id="owner-filter"
          value={ownerId}
          onChange={(e) => setOwnerId(e.target.value)}
          className="min-h-11 rounded-md border border-line-strong bg-white px-3 text-[15px]"
        >
          <option value="">Everyone&apos;s deals</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {error && <Alert>{error}</Alert>}
      {board.error && <Alert>{board.error.message}</Alert>}

      {!columns ? (
        <div className="flex gap-3 overflow-hidden" aria-busy="true">
          {DEAL_STAGES.slice(0, 4).map((s) => (
            <Skeleton key={s} className="h-[420px] w-[280px] flex-none" />
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={() => {
            setActiveId(null);
            dragStart.current = null;
            setColumns(board.data ? toColumns(board.data) : null);
          }}
        >
          <div className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-4 md:-mx-8 md:px-8">
            {DEAL_STAGES.map((stage) => (
              <Column
                key={stage}
                stage={stage}
                deals={columns[stage]}
                currency={currency}
                today={today}
                onOpen={setEditingId}
                onAdd={() => setCreatingIn(stage)}
              />
            ))}
          </div>
          <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }}>
            {activeDeal && <DealCard deal={activeDeal} currency={currency} today={today} lifted />}
          </DragOverlay>
        </DndContext>
      )}

      <Modal open={creatingIn !== null} onClose={() => setCreatingIn(null)} title="New deal" wide>
        <DealForm
          currency={currency}
          defaults={{ stage: creatingIn ?? "LEAD" }}
          onCancel={() => setCreatingIn(null)}
          onSaved={() => {
            setCreatingIn(null);
            board.reload();
          }}
        />
      </Modal>

      <Modal open={editingDeal !== null} onClose={() => setEditingId(null)} title={editingDeal?.title ?? "Deal"} wide>
        {editingDeal && (
          <DealForm
            key={editingDeal.id}
            deal={editingDeal}
            currency={currency}
            onCancel={() => setEditingId(null)}
            onSaved={() => {
              setEditingId(null);
              board.reload();
            }}
            extraActions={
              <DealExtraActions
                deal={editingDeal}
                canDelete={hasRole(company.role, "ADMIN")}
                onDeleted={() => {
                  setEditingId(null);
                  board.reload();
                }}
              />
            }
          />
        )}
      </Modal>
    </>
  );
}

// ---------- Column ----------

function Column({
  stage,
  deals,
  currency,
  today,
  onOpen,
  onAdd,
}: {
  stage: DealStage;
  deals: Deal[];
  currency: string;
  today: string;
  onOpen: (id: string) => void;
  onAdd: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const tone = stage === "WON" ? "live" : stage === "LOST" ? "alarm" : "default";

  return (
    <section aria-label={`${stageLabel(stage)}, ${deals.length} deals`} className="flex w-[280px] flex-none snap-start flex-col rounded-lg bg-[#e9eae7]">
      <header className="on-board flex flex-col gap-2 rounded-t-lg bg-board px-3 py-3 text-flap">
        <div className="flex items-center justify-between gap-2">
          <Tile tone={tone}>{stageLabel(stage)}</Tile>
          <span aria-live="polite">
            <Tile tone="dim">{String(deals.length)}</Tile>
          </span>
        </div>
        <span className="text-sm text-board-text tabular-nums">{formatMoney(sum(deals), currency)}</span>
      </header>
      <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            "flex min-h-[140px] flex-1 flex-col gap-2 p-2 transition-colors duration-150",
            isOver && "bg-signal/20",
          )}
        >
          {deals.map((deal) => (
            <SortableCard key={deal.id} deal={deal} currency={currency} today={today} onOpen={onOpen} />
          ))}
          {deals.length === 0 && (
            <p className="rounded-md border border-dashed border-line-strong px-3 py-6 text-center text-[13px] text-subtle">
              Drop a deal here
            </p>
          )}
        </div>
      </SortableContext>
      <button
        type="button"
        onClick={onAdd}
        className="m-2 mt-0 flex min-h-10 items-center justify-center gap-1.5 rounded-md text-sm font-semibold text-muted hover:bg-white hover:text-ink"
      >
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add deal
      </button>
    </section>
  );
}

// ---------- Cards ----------

function SortableCard({ deal, currency, today, onOpen }: { deal: Deal; currency: string; today: string; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      aria-label={`${deal.title}, ${formatMoney(deal.value, currency)}. Press Enter to open, Space to move.`}
      onClick={() => onOpen(deal.id)}
      onKeyDown={(e) => {
        listeners?.onKeyDown?.(e);
        if (e.key === "Enter" && !e.defaultPrevented) onOpen(deal.id);
      }}
      className={cn("touch-manipulation rounded-md outline-offset-2", isDragging && "opacity-40")}
    >
      <DealCard deal={deal} currency={currency} today={today} />
    </div>
  );
}

function DealCard({ deal, currency, today, lifted = false }: { deal: Deal; currency: string; today: string; lifted?: boolean }) {
  const overdue = deal.expectedCloseDate && !deal.closedAt && deal.expectedCloseDate.slice(0, 10) < today;

  return (
    <article
      className={cn(
        "flex cursor-grab flex-col gap-2 rounded-md border border-line bg-white p-3 text-left select-none hover:border-[#9aa09c]",
        lifted && "rotate-[1.5deg] cursor-grabbing shadow-[0_12px_28px_rgba(17,19,21,0.25)]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[15px] leading-snug font-semibold">{deal.title}</h3>
        {deal.owner && <Avatar text={initials(deal.owner.name)} />}
      </div>
      <p className="text-lg font-semibold tabular-nums">{formatMoney(deal.value, currency)}</p>
      {(deal.contact || deal.organization) && (
        <p className="truncate text-[13px] text-muted">{[deal.contact?.name, deal.organization?.name].filter(Boolean).join(" · ")}</p>
      )}
      {(deal.expectedCloseDate || deal.closedAt) && (
        <p className={cn("text-[13px] tabular-nums", overdue ? "font-semibold text-danger" : "text-subtle")}>
          {deal.closedAt
            ? `Closed ${formatDate(deal.closedAt)}`
            : `${overdue ? "Overdue · " : "Close by "}${formatDate(deal.expectedCloseDate!)}`}
        </p>
      )}
    </article>
  );
}

// ---------- Deal modal extras ----------

function DealExtraActions({ deal, canDelete, onDeleted }: { deal: Deal; canDelete: boolean; onDeleted: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setBusy(true);
    setError("");
    try {
      await api(`/api/deals/${deal.id}`, { method: "DELETE" });
      onDeleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {deal.contact && (
        <Link href={`/contacts/${deal.contact.id}`} className="text-sm font-semibold underline underline-offset-[3px]">
          Open {deal.contact.name}
        </Link>
      )}
      {canDelete &&
        (confirm ? (
          <>
            <Button size="sm" onClick={() => setConfirm(false)} disabled={busy}>
              Keep
            </Button>
            <Button size="sm" variant="danger" loading={busy} onClick={remove} autoFocus>
              Delete deal
            </Button>
          </>
        ) : (
          <Button size="sm" variant="danger" onClick={() => setConfirm(true)}>
            Delete
          </Button>
        ))}
      {error && <span className="text-[13px] text-danger">{error}</span>}
    </div>
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
