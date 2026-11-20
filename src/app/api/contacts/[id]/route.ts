import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { api, HttpError, isEmail, json, optionalOneOf, readBody, refId, text } from "@/lib/http";
import { requireCompany } from "@/lib/tenant";
import {
  checkMember,
  checkOrganization,
  CONTACT_TYPES,
  contactDetailSelect,
  findContactOr404,
} from "@/lib/crm";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/contacts/:id -> contact with organization, owner and deals (any member)
export const GET = api(async (_req: NextRequest, { params }: Ctx) => {
  const { companyId } = await requireCompany("MEMBER");
  const { id } = await params;

  const contact = await prisma.contact.findFirst({ where: { id, companyId }, select: contactDetailSelect });
  if (!contact) throw new HttpError(404, "Contact not found");

  return json({ contact });
});

// PATCH /api/contacts/:id { name?, type?, email?, phone?, jobTitle?, organizationId?, ownerId?, address?, notes? }
// Any member. Send null to clear a field or a link.
export const PATCH = api(async (req: NextRequest, { params }: Ctx) => {
  const { companyId } = await requireCompany("MEMBER");
  const { id } = await params;
  await findContactOr404(companyId, id);
  const body = await readBody(req);

  const name = text(body, "name", { max: 150 });
  if (name === null) throw new HttpError(400, `"name" cannot be empty`);
  const email = text(body, "email", { max: 200 });
  if (email && !isEmail(email)) throw new HttpError(400, `"email" is not a valid email`);

  const organizationId = refId(body, "organizationId");
  const ownerId = refId(body, "ownerId");
  await checkOrganization(companyId, organizationId);
  await checkMember(companyId, ownerId);

  const contact = await prisma.contact.update({
    where: { id },
    data: {
      name,
      type: optionalOneOf(body, "type", CONTACT_TYPES),
      email: email ? email.toLowerCase() : email,
      phone: text(body, "phone", { max: 50 }),
      jobTitle: text(body, "jobTitle", { max: 100 }),
      address: text(body, "address", { max: 500 }),
      notes: text(body, "notes", { max: 5000 }),
      organizationId,
      ownerId,
    },
    select: contactDetailSelect,
  });

  return json({ contact });
});

// DELETE /api/contacts/:id (ADMIN+). Deletes its activities; its deals stay, unlinked.
// 409 if the contact has invoices.
export const DELETE = api(async (_req: NextRequest, { params }: Ctx) => {
  const { companyId } = await requireCompany("ADMIN");
  const { id } = await params;
  await findContactOr404(companyId, id);

  const invoices = await prisma.invoice.count({ where: { contactId: id } });
  if (invoices > 0) {
    throw new HttpError(409, `This contact has ${invoices} invoice(s). Invoices must be kept, so the contact can't be deleted`);
  }

  await prisma.contact.delete({ where: { id } });
  return json({ deleted: true });
});
