import { prisma } from "@/lib/prisma";
import {
  api,
  HttpError,
  isEmail,
  json,
  optionalOneOf,
  pageParams,
  readBody,
  refId,
  requiredText,
  searchParam,
  text,
} from "@/lib/http";
import { requireCompany } from "@/lib/tenant";
import { checkMember, checkOrganization, CONTACT_TYPES, contactListSelect } from "@/lib/crm";
import type { Prisma } from "@/generated/prisma/client";

// GET /api/contacts?q=&type=LEAD|CLIENT&organizationId=&ownerId=&page=&pageSize= (any member)
export const GET = api(async (req) => {
  const { companyId } = await requireCompany("MEMBER");
  const params = req.nextUrl.searchParams;
  const q = searchParam(req);
  const type = params.get("type");
  const { page, pageSize, skip } = pageParams(req);

  if (type && !CONTACT_TYPES.includes(type as (typeof CONTACT_TYPES)[number])) {
    throw new HttpError(400, `"type" must be one of: ${CONTACT_TYPES.join(", ")}`);
  }

  const where: Prisma.ContactWhereInput = {
    companyId,
    ...(type && { type: type as (typeof CONTACT_TYPES)[number] }),
    ...(params.get("organizationId") && { organizationId: params.get("organizationId") }),
    ...(params.get("ownerId") && { ownerId: params.get("ownerId") }),
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { organization: { name: { contains: q, mode: "insensitive" } } },
      ],
    }),
  };

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({ where, orderBy: { name: "asc" }, skip, take: pageSize, select: contactListSelect }),
    prisma.contact.count({ where }),
  ]);

  return json({ contacts, total, page, pageSize });
});

// POST /api/contacts { name, type?, email?, phone?, jobTitle?, organizationId?, ownerId?, address?, notes? }
// Any member. ownerId defaults to you.
export const POST = api(async (req) => {
  const { companyId, user } = await requireCompany("MEMBER");
  const body = await readBody(req);

  const email = text(body, "email", { max: 200 });
  if (email && !isEmail(email)) throw new HttpError(400, `"email" is not a valid email`);

  const organizationId = refId(body, "organizationId");
  const ownerId = refId(body, "ownerId");
  await checkOrganization(companyId, organizationId);
  await checkMember(companyId, ownerId);

  const contact = await prisma.contact.create({
    data: {
      companyId,
      name: requiredText(body, "name", 150),
      type: optionalOneOf(body, "type", CONTACT_TYPES),
      email: email?.toLowerCase() ?? email,
      phone: text(body, "phone", { max: 50 }),
      jobTitle: text(body, "jobTitle", { max: 100 }),
      address: text(body, "address", { max: 500 }),
      notes: text(body, "notes", { max: 5000 }),
      organizationId,
      ownerId: ownerId === undefined ? user.id : ownerId,
    },
    select: contactListSelect,
  });

  return json({ contact }, 201);
});
