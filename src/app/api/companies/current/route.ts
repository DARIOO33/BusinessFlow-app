import { prisma } from "@/lib/prisma";
import { api, HttpError, isEmail, json, readBody, text } from "@/lib/http";
import { clearActiveCompany, requireCompany } from "@/lib/tenant";

// GET /api/companies/current -> the active company (any member)
export const GET = api(async () => {
  const { companyId, role } = await requireCompany("MEMBER");
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });
  return json({ company, role });
});

// PATCH /api/companies/current { name?, email?, phone?, address?, taxId?, logoUrl?, currency? }
// ADMIN or OWNER. Send null to clear an optional field.
export const PATCH = api(async (req) => {
  const { companyId } = await requireCompany("ADMIN");
  const body = await readBody(req);

  const name = text(body, "name", { max: 100 });
  if (name === null) throw new HttpError(400, `"name" cannot be empty`);
  if (name !== undefined && name.length < 2) {
    throw new HttpError(400, `"name" must be at least 2 characters`);
  }

  const email = text(body, "email", { max: 200 });
  if (email && !isEmail(email)) throw new HttpError(400, `"email" is not a valid email`);

  const currency = text(body, "currency", { max: 3 });
  if (currency === null) throw new HttpError(400, `"currency" cannot be empty`);
  if (currency !== undefined && !/^[A-Z]{3}$/.test(currency)) {
    throw new HttpError(400, `"currency" must be a 3-letter code like TND, EUR, USD`);
  }

  const company = await prisma.company.update({
    where: { id: companyId },
    data: {
      name,
      email,
      currency,
      phone: text(body, "phone", { max: 50 }),
      address: text(body, "address", { max: 500 }),
      taxId: text(body, "taxId", { max: 50 }),
      logoUrl: text(body, "logoUrl", { max: 500 }),
    },
  });

  return json({ company });
});

// DELETE /api/companies/current -> deletes the company and ALL its data (OWNER only)
export const DELETE = api(async () => {
  const { companyId } = await requireCompany("OWNER");

  await prisma.$transaction([
    // Invoices first: contacts can't be deleted while invoices point to them.
    prisma.invoice.deleteMany({ where: { companyId } }),
    prisma.company.delete({ where: { id: companyId } }),
  ]);
  await clearActiveCompany(companyId);

  return json({ deleted: true });
});
