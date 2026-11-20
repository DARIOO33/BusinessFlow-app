import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { api, HttpError, json } from "@/lib/http";

type Ctx = { params: Promise<{ token: string }> };

// GET /api/invitations/token/:token -> public preview of an invitation
// (used by the "You've been invited to X" page before sign-in)
export const GET = api(async (_req: NextRequest, { params }: Ctx) => {
  const { token } = await params;

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { company: { select: { name: true } } },
  });
  if (!invitation) throw new HttpError(404, "Invitation not found");
  if (invitation.expiresAt < new Date()) throw new HttpError(410, "This invitation has expired");

  return json({
    companyName: invitation.company.name,
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
  });
});
