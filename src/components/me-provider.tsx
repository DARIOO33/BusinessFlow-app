"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, ApiError, type CompanySummary, type Me } from "@/lib/api-client";

// Loads GET /api/me once for the whole app shell and shares it with every page.
// Also makes sure there is an active company:
//   no company at all          -> /onboarding
//   companies but none active  -> switch to the first one

type MeContext = {
  me: Me;
  company: CompanySummary; // the active company, always set inside the app
  refresh: () => Promise<Me>;
  switchCompany: (companyId: string) => Promise<void>;
};

const Context = createContext<MeContext | null>(null);

export function useMe() {
  const value = useContext(Context);
  if (!value) throw new Error("useMe() must be used inside <MeProvider>");
  return value;
}

export function MeProvider({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState("");

  // Shows the loaded data, or goes to /onboarding when there is no company
  const apply = useCallback(
    (data: Me) => {
      if (data.activeCompany) setMe(data);
      else {
        setMe(null);
        router.replace("/onboarding");
      }
      return data;
    },
    [router],
  );

  const load = useCallback(async () => apply(await fetchMe()), [apply]);

  useEffect(() => {
    fetchMe().then(apply, (err) => {
      if (err instanceof ApiError && err.status === 401) router.replace("/sign-in");
      else setError(err instanceof Error ? err.message : "Could not load your account.");
    });
  }, [apply, router]);

  const switchCompany = useCallback(
    async (companyId: string) => {
      await api("/api/companies/switch", { method: "POST", body: { companyId } });
      await load();
      router.refresh();
    },
    [load, router],
  );

  if (error) {
    return (
      <div role="alert" className="p-8 text-danger">
        {error}
      </div>
    );
  }
  if (!me?.activeCompany) return fallback;

  return (
    <Context.Provider value={{ me, company: me.activeCompany, refresh: load, switchCompany }}>
      {children}
    </Context.Provider>
  );
}

// GET /api/me, switching to the first company when none is active
async function fetchMe() {
  let data = await api<Me>("/api/me");
  if (!data.activeCompany && data.companies.length > 0) {
    await api("/api/companies/switch", { method: "POST", body: { companyId: data.companies[0].id } });
    data = await api<Me>("/api/me");
  }
  return data;
}
