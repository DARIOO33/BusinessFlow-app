import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { api, HttpError, isEmail, json, oneOf, readBody, requiredText } from "@/lib/http";
import { requireCompany, ROLES } from "@/lib/tenant";

const INVITE_DAYS = 7;

// GET /api/invitations -> pending invitations of the active company (ADMIN+)
export const GET = api(async () => {
  const { companyId } = await requireCompany("ADMIN");

  const invitations = await prisma.invitation.findMany({
    where: { companyId },
    select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  return json({
    invitations: invitations.map((i) => ({ ...i, expired: i.expiresAt < now })),
  });
});

// POST /api/invitations { email, role? } -> invite someone by email (ADMIN+)
// Inviting the same email again replaces the old invitation (new link, new expiry).
export const POST = api(async (req) => {
  const { companyId, role: myRole } = await requireCompany("ADMIN");
  const body = await readBody(req);

  const email = requiredText(body, "email", 200).toLowerCase();
  if (!isEmail(email)) throw new HttpError(400, `"email" is not a valid email`);

  const role = body.role === undefined ? "MEMBER" : oneOf(body.role, ROLES, "role");
  if (role === "OWNER" && myRole !== "OWNER") {
    throw new HttpError(403, "Only an OWNER can invite another OWNER");
  }

  const alreadyMember = await prisma.membership.findFirst({
    where: { companyId, user: { email } },
  });
  if (alreadyMember) throw new HttpError(409, "This person is already a member");

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000);

  const invitation = await prisma.invitation.upsert({
    where: { companyId_email: { companyId, email } },
    create: { companyId, email, role, token, expiresAt },
    update: { role, token, expiresAt },
    include: { company: { select: { name: true } } },
  });

  // TODO: send a real email here (SMTP / Brevo / Resend). For now: log + return the link.
  const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const inviteLink = `${baseUrl}/invite/${token}`;
  console.log(`[invite] ${email} -> ${invitation.company.name} as ${role}: ${inviteLink}`);

  return json(
    {
      invitation: { id: invitation.id, email, role, expiresAt },
      inviteLink, // frontend page (later)
      acceptUrl: `${baseUrl}/api/invitations/token/${token}/accept`, // POST, for Postman
    },
    201,
  );
});
