import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-4">
      <h1 className="text-3xl font-semibold">Next Starter</h1>
      <p className="opacity-70">Next.js 16 · Prisma 7 · PostgreSQL · Better Auth · Tailwind 4</p>

      <div className="flex gap-3">
        {session ? (
          <Link href="/dashboard" className="rounded-lg bg-blue-600 px-4 py-2 text-white">
            Go to dashboard
          </Link>
        ) : (
          <>
            <Link href="/sign-in" className="rounded-lg bg-blue-600 px-4 py-2 text-white">
              Sign in
            </Link>
            <Link href="/sign-up" className="rounded-lg border px-4 py-2">
              Create account
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
