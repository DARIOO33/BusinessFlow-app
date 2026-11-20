import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { api, HttpError, json } from "@/lib/http";
import { requireCompany } from "@/lib/tenant";

type Ctx = { params: Promise<{ id: string }> };

// DELETE /api/invitations/:id -> cancel an invitation (ADMIN+)
export const DELETE = api(async (_req: NextRequest, { params }: Ctx) => {
  const { companyId } = await requireCompany("ADMIN");
  const { id } = await params;

  // companyId in the filter: you can only cancel your own company's invitations
  const { count } = await prisma.invitation.deleteMany({ where: { id, companyId } });
  if (count === 0) throw new HttpError(404, "Invitation not found");

  return json({ deleted: true });
});
