import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { api, dateField, HttpError, json, optionalOneOf, readBody, refId, text } from "@/lib/http";
import { hasRole, requireCompany } from "@/lib/tenant";
import { ACTIVITY_TYPES, activitySelect, checkDeal } from "@/lib/crm";

type Ctx = { params: Promise<{ id: string }> };

// Only the author, or an ADMIN/OWNER, can change or delete an activity.
async function findEditable(id: string) {
  const { companyId, user, role } = await requireCompany("MEMBER");
  const activity = await prisma.activity.findFirst({ where: { id, companyId } });
  if (!activity) throw new HttpError(404, "Activity not found");
  if (activity.authorId !== user.id && !hasRole(role, "ADMIN")) {
    throw new HttpError(403, "Only the author, an ADMIN or an OWNER can change this note");
  }
  return { activity, companyId };
}

// PATCH /api/activities/:id { body?, type?, occurredAt?, dealId? }
export const PATCH = api(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const { companyId } = await findEditable(id);
  const body = await readBody(req);

  const content = text(body, "body", { max: 5000 });
  if (content === null) throw new HttpError(400, `"body" cannot be empty`);
  const occurredAt = dateField(body, "occurredAt");
  if (occurredAt === null) throw new HttpError(400, `"occurredAt" cannot be empty`);
  const dealId = refId(body, "dealId");
  await checkDeal(companyId, dealId);

  const activity = await prisma.activity.update({
    where: { id },
    data: { body: content, type: optionalOneOf(body, "type", ACTIVITY_TYPES), occurredAt, dealId },
    select: activitySelect,
  });

  return json({ activity });
});

// DELETE /api/activities/:id
export const DELETE = api(async (_req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  await findEditable(id);
  await prisma.activity.delete({ where: { id } });
  return json({ deleted: true });
});
