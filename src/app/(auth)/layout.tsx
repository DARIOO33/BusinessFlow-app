// Shared layout for /sign-in and /sign-up (the "(auth)" folder is not in the URL)
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-black/10 p-6 shadow-sm dark:border-white/10">
        {children}
      </div>
    </main>
  );
}
