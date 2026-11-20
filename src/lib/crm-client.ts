"use client";

import { useEffect, useState } from "react";
import { useApi, type Company } from "@/lib/api-client";

// Browser-side types and helpers for the CRM pages.

export const DEAL_STAGES = ["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"] as const;
export type DealStage = (typeof DEAL_STAGES)[number];

export const ACTIVITY_TYPES = ["NOTE", "CALL", "EMAIL", "MEETING"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export type ContactType = "LEAD" | "CLIENT";

type Person = { id: string; name: string; email: string };
type Ref = { id: string; name: string };

export type OrganizationListItem = {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  phone: string | null;
  createdAt: string;
  _count: { contacts: number; deals: number };
};

export type OrganizationDetail = {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  contacts: { id: string; name: string; email: string | null; phone: string | null; jobTitle: string | null; type: ContactType }[];
  deals: DealSummary[];
};

export type ContactListItem = {
  id: string;
  type: ContactType;
  name: string;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  createdAt: string;
  updatedAt: string;
  organization: Ref | null;
  owner: Person | null;
  _count: { deals: number; activities: number };
};

export type DealSummary = { id: string; title: string; value: string; stage: DealStage; closedAt: string | null };

export type ContactDetail = ContactListItem & { address: string | null; notes: string | null; deals: DealSummary[] };

export type Deal = {
  id: string;
  title: string;
  value: string;
  stage: DealStage;
  position: number;
  expectedCloseDate: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  contact: Person | null;
  organization: Ref | null;
  owner: Person | null;
};

export type Board = {
  currency: string;
  stages: { stage: DealStage; count: number; total: string; deals: Deal[] }[];
};

export type Activity = {
  id: string;
  type: ActivityType;
  body: string;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
  contactId: string;
  author: Person | null;
  deal: { id: string; title: string } | null;
};

export type Paged<K extends string, T> = { [key in K]: T[] } & { total: number; page: number; pageSize: number };

// ---------- Labels ----------

export function stageLabel(stage: DealStage) {
  return stage.charAt(0) + stage.slice(1).toLowerCase();
}

export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  NOTE: "Note",
  CALL: "Call",
  EMAIL: "Email",
  MEETING: "Meeting",
};

// ---------- Formatting ----------

// formatMoney("12000.50", "USD") -> "$12,000.50" ; whole amounts drop the cents
export function formatMoney(value: string | number, currency = "USD") {
  const amount = Number(value);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

// "2026-12-31T00:00:00.000Z" -> "2026-12-31" for <input type="date">
export function toDateInput(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

// Value that follows `value` after the user stops typing for `delay` ms (for search boxes)
export function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// The active company's currency ("USD" while loading)
export function useCurrency() {
  return useApi<{ company: Company }>("/api/companies/current").data?.company.currency ?? "USD";
}
