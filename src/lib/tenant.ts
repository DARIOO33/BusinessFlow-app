import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/http";
import { hasRole, ROLES, type Role } from "@/lib/roles";

export { hasRole, ROLES };

// Multi-tenancy rules, used by every API route.
//
// The "active company" is stored on the session (session.activeCompanyId).
// Routes NEVER trust a companyId sent by the client for reading/writing data:
// they always use the companyId returned by requireCompany().

// 401 if not signed in.
export async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new HttpError(401, "Not signed in");
  return {
    user: session.user,
    sessionId: session.session.id,
    activeCompanyId: session.session.activeCompanyId ?? null,
  };
}

// 401 if not signed in, 400 if no active company,
// 403 if not a member of it or if the role is too low.
export async function requireCompany(minRole: Role = "MEMBER") {
  const { user, sessionId, activeCompanyId } = await requireUser();

  if (!activeCompanyId) {
    throw new HttpError(
      400,
      "No active company. Create one (POST /api/companies) or switch (POST /api/companies/switch)",
    );
  }

  const membership = await prisma.membership.findUnique({
    where: { companyId_userId: { companyId: activeCompanyId, userId: user.id } },
  });
  if (!membership) throw new HttpError(403, "You are not a member of this company");

  if (!hasRole(membership.role, minRole)) {
    throw new HttpError(403, `This action needs the ${minRole} role (you are ${membership.role})`);
  }

  return { user, sessionId, companyId: activeCompanyId, role: membership.role };
}

// Makes a company the active one for this session.
export async function setActiveCompany(sessionId: string, companyId: string | null) {
  await prisma.session.update({ where: { id: sessionId }, data: { activeCompanyId: companyId } });
}

// When someone loses access to a company, clear it from their sessions.
export async function clearActiveCompany(companyId: string, userId?: string) {
  await prisma.session.updateMany({
    where: { activeCompanyId: companyId, ...(userId ? { userId } : {}) },
    data: { activeCompanyId: null },
  });
}

export async function countOwners(companyId: string) {
  return prisma.membership.count({ where: { companyId, role: "OWNER" } });
}
