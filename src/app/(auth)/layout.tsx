import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Wordmark } from "@/components/brand";

// Shared layout for /sign-in and /sign-up (the "(auth)" folder is not in the URL).
// Dark board panel on the left, the form on the right (stacked on phones).
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <section className="on-board flex flex-col justify-between gap-10 bg-board p-8 text-flap md:w-[42%] md:max-w-[560px] md:p-10">
        <Wordmark size="lg" />
        <div className="flex max-w-md flex-col gap-4">
          <p className="text-[26px] leading-tight font-semibold tracking-[-0.01em] md:text-[30px]">
            Clients, invoices and the work in between. One place for your whole team.
          </p>
          <p className="text-[15px] leading-relaxed text-board-muted">
            Create your account, then start a company workspace or join the one you were invited to.
          </p>
        </div>
      </section>
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">{children}</div>
      </main>
    </div>
  );
}
