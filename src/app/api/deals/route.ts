import { prisma } from "@/lib/prisma";
import { api, dateField, json, money, oneOf, readBody, refId, requiredText, searchParam } from "@/lib/http";
import { requireCompany } from "@/lib/tenant";
import { checkContact, checkMember, checkOrganization, DEAL_STAGES, dealSelect, sumValues } from "@/lib/crm";
import type { Prisma } from "@/generated/prisma/client";

// GET /api/deals?q=&ownerId=&contactId=&organizationId= -> the kanban board (any member)
// { currency, stages: [{ stage, count, total, deals: [...] }] } in pipeline order.
export const GET = api(async (req) => {
  const { companyId } = await requireCompany("MEMBER");
  const params = req.nextUrl.searchParams;
  const q = searchParam(req);

  const where: Prisma.DealWhereInput = {
    companyId,
    ...(params.get("ownerId") && { ownerId: params.get("ownerId") }),
    ...(params.get("contactId") && { contactId: params.get("contactId") }),
    ...(params.get("organizationId") && { organizationId: params.get("organizationId") }),
    ...(q && {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { contact: { name: { contains: q, mode: "insensitive" } } },
        { organization: { name: { contains: q, mode: "insensitive" } } },
      ],
    }),
  };

  const [deals, company] = await Promise.all([
    prisma.deal.findMany({ where, orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: dealSelect }),
    prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { currency: true } }),
  ]);

  const stages = DEAL_STAGES.map((stage) => {
    const list = deals.filter((d) => d.stage === stage);
    return { stage, count: list.length, total: sumValues(list), deals: list };
  });

  return json({ currency: company.currency, stages });
});

// POST /api/deals { title, value?, stage?, contactId?, organizationId?, ownerId?, expectedCloseDate? }
// Any member. Added at the bottom of its column. ownerId defaults to you.
export const POST = api(async (req) => {
  const { companyId, user } = await requireCompany("MEMBER");
  const body = await readBody(req);

  const stage = body.stage === undefined ? "LEAD" : oneOf(body.stage, DEAL_STAGES, "stage");
  const contactId = refId(body, "contactId");
  const organizationId = refId(body, "organizationId");
  const ownerId = refId(body, "ownerId");
  await checkContact(companyId, contactId);
  await checkOrganization(companyId, organizationId);
  await checkMember(companyId, ownerId);

  const position = await prisma.deal.count({ where: { companyId, stage } });

  const deal = await prisma.deal.create({
    data: {
      companyId,
      title: requiredText(body, "title", 200),
      value: money(body, "value"),
      stage,
      position,
      contactId,
      organizationId,
      ownerId: ownerId === undefined ? user.id : ownerId,
      expectedCloseDate: dateField(body, "expectedCloseDate"),
      closedAt: stage === "WON" || stage === "LOST" ? new Date() : null,
    },
    select: dealSelect,
  });

  return json({ deal }, 201);
});
