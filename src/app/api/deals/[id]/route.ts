import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { api, dateField, HttpError, json, money, readBody, refId, text } from "@/lib/http";
import { requireCompany } from "@/lib/tenant";
import { activitySelect, checkContact, checkMember, checkOrganization, dealSelect, findDealOr404 } from "@/lib/crm";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/deals/:id -> deal + activities linked to it (any member)
export const GET = api(async (_req: NextRequest, { params }: Ctx) => {
  const { companyId } = await requireCompany("MEMBER");
  const { id } = await params;

  const deal = await prisma.deal.findFirst({
    where: { id, companyId },
    select: {
      ...dealSelect,
      activities: { select: activitySelect, orderBy: { occurredAt: "desc" } },
    },
  });
  if (!deal) throw new HttpError(404, "Deal not found");

  return json({ deal });
});

// PATCH /api/deals/:id { title?, value?, contactId?, organizationId?, ownerId?, expectedCloseDate? }
// Any member. To change the stage or order, use POST /api/deals/:id/move.
export const PATCH = api(async (req: NextRequest, { params }: Ctx) => {
  const { companyId } = await requireCompany("MEMBER");
  const { id } = await params;
  await findDealOr404(companyId, id);
  const body = await readBody(req);

  if (body.stage !== undefined || body.position !== undefined) {
    throw new HttpError(400, `Use POST /api/deals/${id}/move { stage, index } to move a deal`);
  }

  const title = text(body, "title", { max: 200 });
  if (title === null) throw new HttpError(400, `"title" cannot be empty`);

  const contactId = refId(body, "contactId");
  const organizationId = refId(body, "organizationId");
  const ownerId = refId(body, "ownerId");
  await checkContact(companyId, contactId);
  await checkOrganization(companyId, organizationId);
  await checkMember(companyId, ownerId);

  const deal = await prisma.deal.update({
    where: { id },
    data: {
      title,
      value: money(body, "value"),
      contactId,
      organizationId,
      ownerId,
      expectedCloseDate: dateField(body, "expectedCloseDate"),
    },
    select: dealSelect,
  });

  return json({ deal });
});

// DELETE /api/deals/:id (ADMIN+). Notes linked to it stay on the contact.
export const DELETE = api(async (_req: NextRequest, { params }: Ctx) => {
  const { companyId } = await requireCompany("ADMIN");
  const { id } = await params;
  const deal = await findDealOr404(companyId, id);

  await prisma.$transaction(async (tx) => {
    await tx.deal.delete({ where: { id } });
    // Close the gap in its column
    await tx.deal.updateMany({
      where: { companyId, stage: deal.stage, position: { gt: deal.position } },
      data: { position: { decrement: 1 } },
    });
  });

  return json({ deleted: true });
});
