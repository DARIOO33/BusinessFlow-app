import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { api, HttpError, json } from "@/lib/http";
import { requireUser, setActiveCompany } from "@/lib/tenant";

type Ctx = { params: Promise<{ token: string }> };

// POST /api/invitations/token/:token/accept -> join the company
// Must be signed in with the same email the invitation was sent to.
export const POST = api(async (_req: NextRequest, { params }: Ctx) => {
  const { user, sessionId } = await requireUser();
  const { token } = await params;

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { company: true },
  });
  if (!invitation) throw new HttpError(404, "Invitation not found");
  if (invitation.expiresAt < new Date()) throw new HttpError(410, "This invitation has expired");
  if (invitation.email !== user.email.toLowerCase()) {
    throw new HttpError(403, `This invitation was sent to ${invitation.email}. Sign in with that email`);
  }

  // Already a member (e.g. accepted twice): keep the current role, just remove the invitation.
  const [membership] = await prisma.$transaction([
    prisma.membership.upsert({
      where: { companyId_userId: { companyId: invitation.companyId, userId: user.id } },
      create: { companyId: invitation.companyId, userId: user.id, role: invitation.role },
      update: {},
    }),
    prisma.invitation.delete({ where: { id: invitation.id } }),
  ]);

  await setActiveCompany(sessionId, invitation.companyId);

  return json({ company: invitation.company, role: membership.role });
});
