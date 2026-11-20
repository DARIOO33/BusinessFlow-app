import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { api, HttpError, json, readBody, text } from "@/lib/http";
import { requireCompany } from "@/lib/tenant";
import { findOrganizationOr404, sumValues } from "@/lib/crm";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/organizations/:id -> organization with its contacts and deals (any member)
export const GET = api(async (_req: NextRequest, { params }: Ctx) => {
  const { companyId } = await requireCompany("MEMBER");
  const { id } = await params;

  const organization = await prisma.organization.findFirst({
    where: { id, companyId },
    include: {
      contacts: {
        select: { id: true, name: true, email: true, phone: true, jobTitle: true, type: true },
        orderBy: { name: "asc" },
      },
      deals: {
        select: { id: true, title: true, value: true, stage: true, closedAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!organization) throw new HttpError(404, "Organization not found");

  const open = organization.deals.filter((d) => d.stage !== "WON" && d.stage !== "LOST");
  return json({ organization, openDealsValue: sumValues(open) });
});

// PATCH /api/organizations/:id { name?, website?, industry?, phone?, address?, notes? } (any member)
export const PATCH = api(async (req: NextRequest, { params }: Ctx) => {
  const { companyId } = await requireCompany("MEMBER");
  const { id } = await params;
  await findOrganizationOr404(companyId, id);
  const body = await readBody(req);

  const name = text(body, "name", { max: 150 });
  if (name === null) throw new HttpError(400, `"name" cannot be empty`);

  const organization = await prisma.organization.update({
    where: { id },
    data: {
      name,
      website: text(body, "website", { max: 300 }),
      industry: text(body, "industry", { max: 100 }),
      phone: text(body, "phone", { max: 50 }),
      address: text(body, "address", { max: 500 }),
      notes: text(body, "notes", { max: 5000 }),
    },
  });

  return json({ organization });
});

// DELETE /api/organizations/:id (ADMIN+). Its contacts and deals stay, unlinked.
export const DELETE = api(async (_req: NextRequest, { params }: Ctx) => {
  const { companyId } = await requireCompany("ADMIN");
  const { id } = await params;
  await findOrganizationOr404(companyId, id);

  await prisma.organization.delete({ where: { id } });
  return json({ deleted: true });
});
