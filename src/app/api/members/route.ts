import { prisma } from "@/lib/prisma";
import { api, json } from "@/lib/http";
import { requireCompany } from "@/lib/tenant";

// GET /api/members -> members of the active company (any member)
export const GET = api(async () => {
  const { companyId } = await requireCompany("MEMBER");

  const memberships = await prisma.membership.findMany({
    where: { companyId },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });

  return json({
    members: memberships.map((m) => ({ ...m.user, role: m.role, joinedAt: m.createdAt })),
  });
});
