"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { initials } from "@/lib/api-client";
import { CompanySwitcher } from "@/components/company-switcher";
import { useMe } from "@/components/me-provider";
import { SignOutButton } from "@/components/sign-out-button";
import { Avatar, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/contacts", label: "Contacts" },
  { href: "/organizations", label: "Organizations" },
  { href: "/deals", label: "Deals" },
  { label: "Projects" },
  { label: "Invoices" },
  { href: "/team", label: "Team" },
  { href: "/settings", label: "Settings" },
];

// Dark sidebar + page content. On phones the sidebar sits on top.
export function AppShell({ children }: { children: React.ReactNode }) {
  const { me, company } = useMe();
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <nav aria-label="Main" className="on-board flex flex-col gap-6 bg-board px-3.5 py-5 text-flap md:sticky md:top-0 md:h-screen md:w-[248px] md:flex-none">
        <CompanySwitcher />
        <ul className="flex flex-wrap gap-0.5 md:flex-col">
          {NAV.map((item) =>
            item.href ? (
              <li key={item.label}>
                <Link
                  href={item.href}
                  aria-current={pathname === item.href || pathname.startsWith(`${item.href}/`) ? "page" : undefined}
                  className={cn(
                    "flex min-h-10 items-center rounded-md px-2.5 text-[15px] font-medium text-board-text no-underline hover:bg-tile hover:text-flap",
                    "aria-[current=page]:bg-tile-active aria-[current=page]:font-semibold aria-[current=page]:text-flap",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ) : (
              <li key={item.label} className="flex min-h-10 items-center justify-between gap-2 px-2.5 text-[15px] text-board-muted">
                {item.label}
                <span className="text-xs text-[#8a9098]">Soon</span>
              </li>
            ),
          )}
        </ul>
        <div className="mt-auto flex items-center gap-2.5 border-t border-board-divider pt-3.5">
          <Avatar text={initials(me.user.name)} dark />
          <span className="min-w-0 flex-1 truncate text-sm">{me.user.name}</span>
          <SignOutButton />
        </div>
      </nav>
      {/* key: pages remount and reload their data when the company changes */}
      <main key={company.id} className="mx-auto flex w-full max-w-[1100px] min-w-0 flex-1 flex-col gap-6 p-5 md:p-8">
        {children}
      </main>
    </div>
  );
}

export function AppShellSkeleton() {
  return (
    <div className="flex min-h-screen flex-col md:flex-row" aria-busy="true">
      <div className="bg-board md:h-screen md:w-[248px]">
        <div className="m-3.5 h-24 rounded-lg border border-board-line" />
      </div>
      <div className="flex flex-1 flex-col gap-6 p-8">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
