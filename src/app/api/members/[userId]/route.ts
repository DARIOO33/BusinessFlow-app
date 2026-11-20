import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { api, HttpError, json, oneOf, readBody } from "@/lib/http";
import { clearActiveCompany, countOwners, requireCompany, ROLES } from "@/lib/tenant";

type Ctx = { params: Promise<{ userId: string }> };

// PATCH /api/members/:userId { role } -> change a member's role (OWNER only)
export const PATCH = api(async (req: NextRequest, { params }: Ctx) => {
  const { companyId } = await requireCompany("OWNER");
  const { userId } = await params;
  const body = await readBody(req);
  const role = oneOf(body.role, ROLES, "role");

  const target = await findMember(companyId, userId);

  // A company must always keep at least one owner
  if (target.role === "OWNER" && role !== "OWNER" && (await countOwners(companyId)) === 1) {
    throw new HttpError(400, "This is the last owner. Make someone else OWNER first");
  }

  const membership = await prisma.membership.update({ where: { id: target.id }, data: { role } });
  return json({ userId, role: membership.role });
});

// DELETE /api/members/:userId -> remove a member
// DELETE /api/members/me      -> leave the company
//   MEMBER: can only leave.  ADMIN: can remove MEMBERs.  OWNER: can remove anyone.
export const DELETE = api(async (_req: NextRequest, { params }: Ctx) => {
  const actor = await requireCompany("MEMBER");
  const { userId: param } = await params;
  const userId = param === "me" ? actor.user.id : param;
  const isSelf = userId === actor.user.id;

  const target = await findMember(actor.companyId, userId);

  if (!isSelf) {
    if (actor.role === "MEMBER") throw new HttpError(403, "Only ADMIN or OWNER can remove members");
    if (actor.role === "ADMIN" && target.role !== "MEMBER") {
      throw new HttpError(403, "ADMIN can only remove MEMBERs");
    }
  }

  if (target.role === "OWNER" && (await countOwners(actor.companyId)) === 1) {
    throw new HttpError(400, "The last owner can't leave. Make someone else OWNER or delete the company");
  }

  await prisma.membership.delete({ where: { id: target.id } });
  await clearActiveCompany(actor.companyId, userId);

  return json({ removed: userId, left: isSelf });
});

async function findMember(companyId: string, userId: string) {
  const membership = await prisma.membership.findUnique({
    where: { companyId_userId: { companyId, userId } },
  });
  if (!membership) throw new HttpError(404, "Member not found");
  return membership;
}
