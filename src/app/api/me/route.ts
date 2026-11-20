import { prisma } from "@/lib/prisma";
import { api, json } from "@/lib/http";
import { requireUser } from "@/lib/tenant";

// GET /api/me -> the signed-in user, their companies and the active one
export const GET = api(async () => {
  const { user, activeCompanyId } = await requireUser();

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: { company: { select: { id: true, name: true, slug: true, plan: true } } },
    orderBy: { createdAt: "asc" },
  });

  const companies = memberships.map((m) => ({ ...m.company, role: m.role }));
  const activeCompany = companies.find((c) => c.id === activeCompanyId) ?? null;

  return json({
    user: { id: user.id, name: user.name, email: user.email, image: user.image },
    activeCompany,
    companies,
  });
});
