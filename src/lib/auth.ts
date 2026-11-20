import { betterAuth } from "better-auth";
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
