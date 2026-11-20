import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { api, HttpError, json, readBody, requiredText, text } from "@/lib/http";
import { requireUser, setActiveCompany } from "@/lib/tenant";

const TRIAL_DAYS = 14;
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// GET /api/companies -> companies I belong to, with my role in each
export const GET = api(async () => {
  const { user, activeCompanyId } = await requireUser();

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: { company: { select: { id: true, name: true, slug: true, plan: true } } },
    orderBy: { createdAt: "asc" },
  });

  return json({
    companies: memberships.map((m) => ({
      ...m.company,
      role: m.role,
      isActive: m.companyId === activeCompanyId,
    })),
  });
});

// POST /api/companies { name, slug? } -> creates a company, I become OWNER, it becomes active
export const POST = api(async (req) => {
  const { user, sessionId } = await requireUser();
  const body = await readBody(req);

  const name = requiredText(body, "name", 100);
  if (name.length < 2) throw new HttpError(400, `"name" must be at least 2 characters`);

  const wantedSlug = text(body, "slug", { max: 50 });
  let slug: string;
  if (wantedSlug) {
    if (wantedSlug.length < 3 || !SLUG_RE.test(wantedSlug)) {
      throw new HttpError(400, `"slug" must be 3-50 characters: lowercase letters, numbers and dashes`);
    }
    const taken = await prisma.company.findUnique({ where: { slug: wantedSlug } });
    if (taken) throw new HttpError(409, "This slug is already taken");
    slug = wantedSlug;
  } else {
    slug = await freeSlug(name);
  }

  const company = await prisma.company.create({
    data: {
      name,
      slug,
      trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
      memberships: { create: { userId: user.id, role: "OWNER" } },
    },
  });

  await setActiveCompany(sessionId, company.id);

  return json({ company, role: "OWNER" }, 201);
});

// "My Agency!" -> "my-agency", or "my-agency-x7k2" if already taken
async function freeSlug(name: string) {
  const base =
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "") // remove accents
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "company";

  let slug = base.length >= 3 ? base : `${base}-co`;
  while (await prisma.company.findUnique({ where: { slug } })) {
    slug = `${base}-${randomBytes(2).toString("hex")}`;
  }
  return slug;
}
