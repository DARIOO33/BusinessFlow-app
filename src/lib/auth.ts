import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";

// Server-side auth. Use it in server components, route handlers and server actions:
//   const session = await auth.api.getSession({ headers: await headers() });
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
  },
  // Better Auth only checks that "name" is a string ("" passes).
  // These hooks run on every user create/update (sign-up, update-user, social login).
  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({ data: { ...user, name: cleanName(user.name) } }),
      },
      update: {
        before: async (user) =>
          user.name === undefined ? undefined : { data: { ...user, name: cleanName(user.name) } },
      },
    },
  },
  session: {
    additionalFields: {
      // Company the user is currently working in. Set by the server only.
      activeCompanyId: { type: "string", required: false, input: false },
    },
  },
  // Add Google, GitHub... here later:
  // socialProviders: { google: { clientId: "...", clientSecret: "..." } },
  plugins: [nextCookies()], // keep this last
});

export type Session = typeof auth.$Infer.Session;

// Trims the name and requires 2-100 characters.
function cleanName(name: unknown) {
  const trimmed = typeof name === "string" ? name.trim().replace(/\s+/g, " ") : "";
  if (trimmed.length < 2 || trimmed.length > 100) {
    throw new APIError("BAD_REQUEST", { message: "Name must be 2-100 characters" });
  }
  return trimmed;
}
