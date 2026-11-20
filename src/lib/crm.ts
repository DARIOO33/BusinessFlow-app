import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/http";
import { Prisma } from "@/generated/prisma/client";

// Shared rules for the CRM routes (contacts, organizations, deals, activities).

export const CONTACT_TYPES = ["LEAD", "CLIENT"] as const;
export const DEAL_STAGES = ["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"] as const;
export const ACTIVITY_TYPES = ["NOTE", "CALL", "EMAIL", "MEETING"] as const;
export type DealStage = (typeof DEAL_STAGES)[number];

export const CLOSED_STAGES: readonly DealStage[] = ["WON", "LOST"];

// ---------- Cross-tenant checks ----------
// A client could send the id of a record from ANOTHER company.
// Before linking records, check the target belongs to the active company.
// (400, not 404: the request itself is wrong.)

export async function checkContact(companyId: string, id: string | null | undefined) {
  if (!id) return;
  const found = await prisma.contact.findFirst({ where: { id, companyId }, select: { id: true } });
  if (!found) throw new HttpError(400, `"contactId" is not a contact of this company`);
}

export async function checkOrganization(companyId: string, id: string | null | undefined) {
  if (!id) return;
  const found = await prisma.organization.findFirst({ where: { id, companyId }, select: { id: true } });
  if (!found) throw new HttpError(400, `"organizationId" is not an organization of this company`);
}

export async function checkDeal(companyId: string, id: string | null | undefined) {
  if (!id) return;
  const found = await prisma.deal.findFirst({ where: { id, companyId }, select: { id: true } });
  if (!found) throw new HttpError(400, `"dealId" is not a deal of this company`);
}

export async function checkMember(companyId: string, userId: string | null | undefined, key = "ownerId") {
  if (!userId) return;
  const found = await prisma.membership.findUnique({ where: { companyId_userId: { companyId, userId } } });
  if (!found) throw new HttpError(400, `"${key}" is not a member of this company`);
}

// ---------- Finders (404 when missing or in another company) ----------

export async function findContactOr404(companyId: string, id: string) {
  const contact = await prisma.contact.findFirst({ where: { id, companyId } });
  if (!contact) throw new HttpError(404, "Contact not found");
  return contact;
}

export async function findOrganizationOr404(companyId: string, id: string) {
  const organization = await prisma.organization.findFirst({ where: { id, companyId } });
  if (!organization) throw new HttpError(404, "Organization not found");
  return organization;
}

export async function findDealOr404(companyId: string, id: string) {
  const deal = await prisma.deal.findFirst({ where: { id, companyId } });
  if (!deal) throw new HttpError(404, "Deal not found");
  return deal;
}

// ---------- What the API returns ----------

const person = { select: { id: true, name: true, email: true } } as const;
const orgRef = { select: { id: true, name: true } } as const;
const contactRef = { select: { id: true, name: true, email: true } } as const;

export const contactListSelect = {
  id: true,
  type: true,
  name: true,
  email: true,
  phone: true,
  jobTitle: true,
  createdAt: true,
  updatedAt: true,
  organization: orgRef,
  owner: person,
  _count: { select: { deals: true, activities: true } },
} satisfies Prisma.ContactSelect;

export const contactDetailSelect = {
  ...contactListSelect,
  address: true,
  notes: true,
  deals: {
    select: { id: true, title: true, value: true, stage: true, closedAt: true },
    orderBy: { createdAt: "desc" },
  },
} satisfies Prisma.ContactSelect;

export const dealSelect = {
  id: true,
  title: true,
  value: true,
  stage: true,
  position: true,
  expectedCloseDate: true,
  closedAt: true,
  createdAt: true,
  updatedAt: true,
  contact: contactRef,
  organization: orgRef,
  owner: person,
} satisfies Prisma.DealSelect;

export const activitySelect = {
  id: true,
  type: true,
  body: true,
  occurredAt: true,
  createdAt: true,
  updatedAt: true,
  contactId: true,
  author: person,
  deal: { select: { id: true, title: true } },
} satisfies Prisma.ActivitySelect;

// Sum of deal values, as a string with 2 decimals ("12500.00")
export function sumValues(deals: { value: Prisma.Decimal }[]) {
  return deals.reduce((sum, d) => sum.plus(d.value), new Prisma.Decimal(0)).toFixed(2);
}
