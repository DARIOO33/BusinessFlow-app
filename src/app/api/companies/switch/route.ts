import { prisma } from "@/lib/prisma";
import { api, HttpError, json, readBody, requiredText } from "@/lib/http";
import { requireUser, setActiveCompany } from "@/lib/tenant";

// POST /api/companies/switch { companyId } -> makes this company the active one
export const POST = api(async (req) => {
  const { user, sessionId } = await requireUser();
  const body = await readBody(req);
  const companyId = requiredText(body, "companyId", 100);

  const membership = await prisma.membership.findUnique({
    where: { companyId_userId: { companyId, userId: user.id } },
    include: { company: true },
  });
  // 404 (not 403) so we don't reveal that the company exists
  if (!membership) throw new HttpError(404, "Company not found");

  await setActiveCompany(sessionId, companyId);

  return json({ company: membership.company, role: membership.role });
});
