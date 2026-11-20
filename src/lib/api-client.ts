"use client";

import { useCallback, useEffect, useState } from "react";
import type { Role } from "@/lib/roles";

// Browser helpers to call our own API routes (src/app/api/...).

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// api("/api/companies", { method: "POST", body: { name } })
// Throws ApiError with the server's { error } message when the response is not OK.
export async function api<T>(
  path: string,
  { method = "GET", body }: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? data?.message ?? `Request failed (${res.status})`);
  }
  return data as T;
}

// Loads a GET route when the component mounts. reload() fetches again.
export function useApi<T>(path: string) {
  const [state, setState] = useState<{ data?: T; error?: ApiError; loading: boolean }>({
    loading: true,
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api<T>(path).then(
      (data) => !cancelled && setState({ data, loading: false }),
      (error: ApiError) => !cancelled && setState({ error, loading: false }),
    );
    return () => {
      cancelled = true;
    };
  }, [path, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}

// ---------- Response types ----------

export type CompanySummary = { id: string; name: string; slug: string; plan: string; role: Role };

export type Me = {
  user: { id: string; name: string; email: string; image: string | null };
  activeCompany: CompanySummary | null;
  companies: CompanySummary[];
};

export type Company = {
  id: string;
  name: string;
  slug: string;
  currency: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxId: string | null;
  logoUrl: string | null;
  plan: string;
  subscriptionStatus: string;
  trialEndsAt: string | null;
};

export type Member = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: Role;
  joinedAt: string;
};

export type Invitation = {
  id: string;
  email: string;
  role: Role;
  expiresAt: string;
  createdAt: string;
  expired: boolean;
};

export type CreatedInvitation = {
  invitation: { id: string; email: string; role: Role; expiresAt: string };
  inviteLink: string;
  acceptUrl: string;
};

// ---------- Formatting ----------

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });

// "2026-11-27T..." -> "27 Nov 2026"
export function formatDate(value: string | Date) {
  return dateFormat.format(new Date(value));
}

export function daysUntil(value: string | Date) {
  return Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000));
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
