"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { initials, useApi } from "@/lib/api-client";
import { useDebounced, type OrganizationListItem, type Paged } from "@/lib/crm-client";
import { OrganizationForm } from "@/components/crm/forms";
import { EmptyRow, Pager, SearchBox, TD, TH } from "@/components/crm/list-bits";
import { Modal } from "@/components/modal";
import { Alert, Button, PageHeader, Panel, Skeleton } from "@/components/ui";

export function OrganizationsView() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const q = useDebounced(search);

  const query = new URLSearchParams({ page: String(page), pageSize: "25" });
  if (q) query.set("q", q);
  const list = useApi<Paged<"organizations", OrganizationListItem>>(`/api/organizations?${query}`);

  return (
    <>
      <PageHeader
        title="Organizations"
        subtitle={list.data ? `${list.data.total} client ${list.data.total === 1 ? "company" : "companies"}` : undefined}
        action={
          <Button variant="primary" onClick={() => setAdding(true)}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New organization
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchBox
          label="Search name, industry or website"
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />
      </div>

      <Panel className="overflow-hidden">
        {list.error ? (
          <div className="p-5">
            <Alert>{list.error.message}</Alert>
          </div>
        ) : list.loading && !list.data ? (
          <div className="flex flex-col gap-3 p-5">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : list.data!.organizations.length === 0 ? (
          q ? (
            <EmptyRow>No organizations match “{q}”.</EmptyRow>
          ) : (
            <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
              <h2 className="text-lg font-semibold">Add the companies you work with</h2>
              <p className="max-w-[48ch] text-[15px] text-muted">
                Group contacts and deals under the client company they belong to.
              </p>
              <Button variant="primary" onClick={() => setAdding(true)}>
                New organization
              </Button>
            </div>
          )
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-[15px]">
                <thead>
                  <tr>
                    <th scope="col" className={TH}>Name</th>
                    <th scope="col" className={TH}>Industry</th>
                    <th scope="col" className={TH}>Phone</th>
                    <th scope="col" className={`${TH} text-right`}>Contacts</th>
                    <th scope="col" className={`${TH} text-right`}>Deals</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data!.organizations.map((o) => (
                    <tr key={o.id} className="hover:bg-[#fafaf8]">
                      <td className={TD}>
                        <div className="flex items-center gap-3">
                          <span aria-hidden="true" className="flex size-9 flex-none items-center justify-center rounded bg-board font-cond text-sm font-semibold text-flap">
                            {initials(o.name)}
                          </span>
                          <div className="min-w-0">
                            <Link href={`/organizations/${o.id}`} className="font-semibold text-ink underline-offset-[3px] hover:underline">
                              {o.name}
                            </Link>
                            {o.website && <div className="truncate text-[13px] text-subtle">{o.website}</div>}
                          </div>
                        </div>
                      </td>
                      <td className={`${TD} text-muted`}>{o.industry ?? "—"}</td>
                      <td className={`${TD} text-muted tabular-nums`}>{o.phone ?? "—"}</td>
                      <td className={`${TD} text-right tabular-nums`}>{o._count.contacts}</td>
                      <td className={`${TD} text-right tabular-nums`}>{o._count.deals}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={list.data!.page} pageSize={list.data!.pageSize} total={list.data!.total} onPage={setPage} />
          </>
        )}
      </Panel>

      <Modal open={adding} onClose={() => setAdding(false)} title="New organization" wide>
        <OrganizationForm
          onCancel={() => setAdding(false)}
          onSaved={(org) => {
            setAdding(false);
            router.push(`/organizations/${org.id}`);
          }}
        />
      </Modal>
    </>
  );
}
