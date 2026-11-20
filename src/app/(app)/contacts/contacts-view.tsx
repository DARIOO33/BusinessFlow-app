"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDate, initials, useApi } from "@/lib/api-client";
import { useDebounced, type ContactListItem, type Paged } from "@/lib/crm-client";
import { ContactForm } from "@/components/crm/forms";
import { EmptyRow, Pager, SearchBox, Segmented, TD, TH } from "@/components/crm/list-bits";
import { Modal } from "@/components/modal";
import { Alert, Avatar, Button, PageHeader, Panel, Skeleton, Tile } from "@/components/ui";

type TypeFilter = "ALL" | "LEAD" | "CLIENT";

export function ContactsView() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [type, setType] = useState<TypeFilter>("ALL");
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const q = useDebounced(search);

  const query = new URLSearchParams({ page: String(page), pageSize: "25" });
  if (q) query.set("q", q);
  if (type !== "ALL") query.set("type", type);
  const list = useApi<Paged<"contacts", ContactListItem>>(`/api/contacts?${query}`);

  const filtered = Boolean(q) || type !== "ALL";

  return (
    <>
      <PageHeader
        title="Contacts"
        subtitle={list.data ? `${list.data.total} ${list.data.total === 1 ? "person" : "people"}` : undefined}
        action={
          <Button variant="primary" onClick={() => setAdding(true)}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New contact
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchBox
          label="Search name, email, phone or organization"
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />
        <Segmented
          label="Contact type"
          value={type}
          onChange={(value) => {
            setType(value);
            setPage(1);
          }}
          options={[
            { value: "ALL", label: "All" },
            { value: "LEAD", label: "Leads" },
            { value: "CLIENT", label: "Clients" },
          ]}
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
            <Skeleton className="h-12" />
          </div>
        ) : list.data!.contacts.length === 0 ? (
          filtered ? (
            <EmptyRow>No contacts match. Try another search or filter.</EmptyRow>
          ) : (
            <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
              <h2 className="text-lg font-semibold">Add your first contact</h2>
              <p className="max-w-[48ch] text-[15px] text-muted">
                Contacts are the people you work with: leads you&apos;re talking to and clients you bill.
              </p>
              <Button variant="primary" onClick={() => setAdding(true)}>
                New contact
              </Button>
            </div>
          )
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-[15px]">
                <thead>
                  <tr>
                    <th scope="col" className={TH}>Name</th>
                    <th scope="col" className={TH}>Organization</th>
                    <th scope="col" className={TH}>Type</th>
                    <th scope="col" className={TH}>Owner</th>
                    <th scope="col" className={`${TH} text-right`}>Deals</th>
                    <th scope="col" className={TH}>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data!.contacts.map((c) => (
                    <tr key={c.id} className="hover:bg-[#fafaf8]">
                      <td className={TD}>
                        <div className="flex items-center gap-3">
                          <Avatar text={initials(c.name)} />
                          <div className="min-w-0">
                            <Link href={`/contacts/${c.id}`} className="font-semibold text-ink underline-offset-[3px] hover:underline">
                              {c.name}
                            </Link>
                            <div className="truncate text-[13px] text-subtle">
                              {[c.jobTitle, c.email].filter(Boolean).join(" · ") || "No email"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className={TD}>
                        {c.organization ? (
                          <Link href={`/organizations/${c.organization.id}`} className="text-ink underline-offset-[3px] hover:underline">
                            {c.organization.name}
                          </Link>
                        ) : (
                          <span className="text-subtle">None</span>
                        )}
                      </td>
                      <td className={TD}>
                        <Tile tone={c.type === "CLIENT" ? "live" : "dim"}>{c.type === "CLIENT" ? "Client" : "Lead"}</Tile>
                      </td>
                      <td className={`${TD} text-muted`}>{c.owner?.name ?? "Nobody"}</td>
                      <td className={`${TD} text-right tabular-nums`}>{c._count.deals}</td>
                      <td className={`${TD} whitespace-nowrap text-muted tabular-nums`}>{formatDate(c.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={list.data!.page} pageSize={list.data!.pageSize} total={list.data!.total} onPage={setPage} />
          </>
        )}
      </Panel>

      <Modal open={adding} onClose={() => setAdding(false)} title="New contact" wide>
        <ContactForm
          onCancel={() => setAdding(false)}
          onSaved={(contact) => {
            setAdding(false);
            router.push(`/contacts/${contact.id}`);
          }}
        />
      </Modal>
    </>
  );
}
