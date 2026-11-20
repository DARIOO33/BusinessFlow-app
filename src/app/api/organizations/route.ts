import { prisma } from "@/lib/prisma";
import { api, json, pageParams, readBody, requiredText, searchParam, text } from "@/lib/http";
import { requireCompany } from "@/lib/tenant";
import type { Prisma } from "@/generated/prisma/client";

// GET /api/organizations?q=&page=&pageSize= -> client organizations (any member)
export const GET = api(async (req) => {
  const { companyId } = await requireCompany("MEMBER");
  const q = searchParam(req);
  const { page, pageSize, skip } = pageParams(req);

  const where: Prisma.OrganizationWhereInput = {
    companyId,
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { industry: { contains: q, mode: "insensitive" } },
        { website: { contains: q, mode: "insensitive" } },
      ],
    }),
  };

  const [organizations, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        name: true,
        website: true,
        industry: true,
        phone: true,
        createdAt: true,
        _count: { select: { contacts: true, deals: true } },
      },
    }),
    prisma.organization.count({ where }),
  ]);

  return json({ organizations, total, page, pageSize });
});

// POST /api/organizations { name, website?, industry?, phone?, address?, notes? } (any member)
export const POST = api(async (req) => {
  const { companyId } = await requireCompany("MEMBER");
  const body = await readBody(req);

  const organization = await prisma.organization.create({
    data: {
      companyId,
      name: requiredText(body, "name", 150),
      website: text(body, "website", { max: 300 }),
      industry: text(body, "industry", { max: 100 }),
      phone: text(body, "phone", { max: 50 }),
      address: text(body, "address", { max: 500 }),
      notes: text(body, "notes", { max: 5000 }),
    },
  });

  return json({ organization }, 201);
});
