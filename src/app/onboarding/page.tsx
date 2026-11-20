import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Wordmark } from "@/components/brand";
import { SignOutButton } from "@/components/sign-out-button";
import { CreateCompanyForm } from "./create-company-form";

export const metadata: Metadata = { title: "Create your company" };

export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?next=/onboarding");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="on-board flex flex-wrap items-center justify-between gap-3 bg-board px-6 py-3.5 text-flap">
        <Wordmark />
        <div className="flex items-center gap-3 text-sm">
          <span className="text-board-text">{session.user.email}</span>
          <SignOutButton />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <CreateCompanyForm />
      </main>
    </div>
  );
}
