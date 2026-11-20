import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { api, dateField, json, optionalOneOf, pageParams, readBody, refId, requiredText } from "@/lib/http";
import { requireCompany } from "@/lib/tenant";
import { ACTIVITY_TYPES, activitySelect, checkDeal, findContactOr404 } from "@/lib/crm";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/contacts/:id/activities?page=&pageSize= -> timeline, newest first (any member)
export const GET = api(async (req: NextRequest, { params }: Ctx) => {
  const { companyId } = await requireCompany("MEMBER");
  const { id } = await params;
  await findContactOr404(companyId, id);
  const { page, pageSize, skip } = pageParams(req, 50);

  const where = { companyId, contactId: id };
  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      skip,
      take: pageSize,
      select: activitySelect,
    }),
    prisma.activity.count({ where }),
  ]);

  return json({ activities, total, page, pageSize });
});

// POST /api/contacts/:id/activities { body, type?, occurredAt?, dealId? } (any member, you are the author)
export const POST = api(async (req: NextRequest, { params }: Ctx) => {
  const { companyId, user } = await requireCompany("MEMBER");
  const { id } = await params;
  await findContactOr404(companyId, id);
  const body = await readBody(req);

  const dealId = refId(body, "dealId");
  await checkDeal(companyId, dealId);

  const activity = await prisma.activity.create({
    data: {
      companyId,
      contactId: id,
      authorId: user.id,
      type: optionalOneOf(body, "type", ACTIVITY_TYPES),
      body: requiredText(body, "body", 5000),
      occurredAt: dateField(body, "occurredAt") ?? undefined,
      dealId,
    },
    select: activitySelect,
  });

  return json({ activity }, 201);
});
