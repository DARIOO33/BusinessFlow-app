import type { NextRequest } from "next/server";

// Small helpers shared by all API routes.

// Throw this anywhere inside a route: api() turns it into a JSON error response.
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// Wraps a route handler: catches errors and always answers with JSON.
//   export const GET = api(async (req) => { ...; return json(data); });
export function api<Ctx>(handler: (req: NextRequest, ctx: Ctx) => Promise<Response>) {
  return async (req: NextRequest, ctx: Ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof HttpError) {
        return Response.json({ error: err.message }, { status: err.status });
      }
      // Prisma "unique constraint failed" (e.g. slug already taken)
      if (isPrismaError(err, "P2002")) {
        return Response.json({ error: "This value already exists" }, { status: 409 });
      }
      // Prisma "foreign key constraint failed" (e.g. deleting a contact that has invoices)
      if (isPrismaError(err, "P2003")) {
        return Response.json({ error: "This record is still used by other records" }, { status: 409 });
      }
      console.error(err);
      return Response.json({ error: "Server error" }, { status: 500 });
    }
  };
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

function isPrismaError(err: unknown, code: string) {
  return typeof err === "object" && err !== null && "code" in err && err.code === code;
}

// ---------- Request body ----------

export type Body = Record<string, unknown>;

// Reads a JSON object body. 400 if it is missing or not an object.
export async function readBody(req: NextRequest): Promise<Body> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, "Body must be JSON");
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new HttpError(400, "Body must be a JSON object");
  }
  return body as Body;
}

// Reads a text field from the body.
//   undefined -> field not sent (leave it unchanged)
//   null      -> field sent as null or "" (clear it), only allowed when not required
export function text(
  body: Body,
  key: string,
  { required = false, max = 200 }: { required?: boolean; max?: number } = {},
): string | null | undefined {
  const value = body[key];
  if (value === undefined && !required) return undefined;
  if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) {
    if (required) throw new HttpError(400, `"${key}" is required`);
    return null;
  }
  if (typeof value !== "string") throw new HttpError(400, `"${key}" must be a string`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw new HttpError(400, `"${key}" must be at most ${max} characters`);
  return trimmed;
}

// Same as text() but the field must be present.
export function requiredText(body: Body, key: string, max = 200): string {
  return text(body, key, { required: true, max }) as string;
}

// Same rules as Better Auth (Zod): letters/numbers/._%+'- before @,
// a real domain, a TLD of 2+ letters, no ".." anywhere, max 254 chars.
const EMAIL_RE =
  /^(?!\.)(?!.*\.\.)[A-Za-z0-9._%+'-]+(?<!\.)@([A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

export function isEmail(value: string) {
  return value.length <= 254 && EMAIL_RE.test(value);
}

// Checks a value is one of the allowed options (e.g. a role).
export function oneOf<T extends string>(value: unknown, options: readonly T[], key: string): T {
  if (typeof value !== "string" || !options.includes(value as T)) {
    throw new HttpError(400, `"${key}" must be one of: ${options.join(", ")}`);
  }
  return value as T;
}

// Optional enum value: undefined when not sent.
export function optionalOneOf<T extends string>(body: Body, key: string, options: readonly T[]): T | undefined {
  return body[key] === undefined ? undefined : oneOf(body[key], options, key);
}

// An id field linking to another record.
//   undefined -> not sent, null -> clear the link, string -> the id
export function refId(body: Body, key: string): string | null | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 100) throw new HttpError(400, `"${key}" must be an id`);
  return value;
}

// A date ("2026-12-31" or a full ISO date). null or "" clears it.
export function dateField(body: Body, key: string): Date | null | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const date = typeof value === "string" ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    throw new HttpError(400, `"${key}" must be a date like 2026-12-31`);
  }
  return date;
}

// Money: a number or numeric string, 0 or more, max 2 decimals. Returned as a string for Prisma Decimal.
export function money(body: Body, key: string): string | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  const text = typeof value === "number" ? String(value) : value;
  if (typeof text !== "string" || !/^\d{1,10}(\.\d{1,2})?$/.test(text.trim())) {
    throw new HttpError(400, `"${key}" must be an amount like 1500 or 1500.50`);
  }
  return text.trim();
}

// A whole number >= 0.
export function wholeNumber(body: Body, key: string, { required = false } = {}): number | undefined {
  const value = body[key];
  if (value === undefined && !required) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new HttpError(400, `"${key}" must be a whole number, 0 or more`);
  }
  return value;
}

// ?page=2&pageSize=25 -> { page, pageSize, skip }
export function pageParams(req: NextRequest, defaultSize = 25) {
  const page = Math.max(1, Number.parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10) || 1);
  const size = Number.parseInt(req.nextUrl.searchParams.get("pageSize") ?? String(defaultSize), 10);
  const pageSize = Math.min(100, Math.max(1, size || defaultSize));
  return { page, pageSize, skip: (page - 1) * pageSize };
}

// ?q=... trimmed, or undefined when empty
export function searchParam(req: NextRequest, key = "q") {
  const value = req.nextUrl.searchParams.get(key)?.trim();
  return value ? value.slice(0, 100) : undefined;
}
