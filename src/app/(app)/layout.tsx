import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MeProvider } from "@/components/me-provider";
import { AppShell, AppShellSkeleton } from "@/components/app-shell";

// Layout for the signed-in app: /dashboard, /team, /settings
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Real check (the proxy only checks that a cookie exists)
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  return (
    <MeProvider fallback={<AppShellSkeleton />}>
      <AppShell>{children}</AppShell>
    </MeProvider>
  );
}
