# Next Starter

A clean starter: **Next.js 16 · React 19 · Prisma 7 · PostgreSQL · Better Auth · Tailwind CSS 4 · TypeScript**.

Email and password sign-up and sign-in work out of the box, and `/dashboard` is protected.

## Versions (pinned)

| Package | Version |
|---|---|
| next | 16.4.6 |
| react / react-dom | 19.3.1 |
| prisma / @prisma/client / @prisma/adapter-pg | 7.10.1 |
| better-auth | 1.7.26 |
| tailwindcss | 4.3.5 |
| Node.js | 24 |

> ⚠️ Do **not** run `npm install prisma` without a version: npm's `latest` tag points at **Prisma 8 RC**, which has no `PrismaClient` and breaks Better Auth.
> Always install with `npm ci` (uses the exact versions in `package-lock.json`).

## Start a new project from this template

```bash
git clone <this-repo> my-project
cd my-project
npm ci
cp .env.example .env          # then edit the values
openssl rand -base64 32       # paste the result into BETTER_AUTH_SECRET
npm run db:migrate            # creates the tables
npm run dev                   # http://localhost:3000
```

Local database (once, on your laptop):

```bash
sudo -u postgres psql -c "CREATE USER app WITH PASSWORD 'app' CREATEDB;" -c "CREATE DATABASE businessflow OWNER app;"
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Generates the Prisma client and builds the app |
| `npm start` | Runs the built app |
| `npm run lint` | ESLint |
| `npm run db:migrate` | After changing `prisma/schema.prisma`: creates and applies a migration (dev) |
| `npm run db:deploy` | Applies existing migrations (production / VPS) |
| `npm run db:studio` | Opens Prisma Studio to see the data |
| `npm run db:generate` | Regenerates the Prisma client |

## Folder structure

```
prisma/
  schema.prisma          Database models (Better Auth tables + yours)
  migrations/            SQL migrations (commit them)
prisma.config.ts         Prisma 7 config (reads DATABASE_URL from .env)
src/
  app/                   Routes (App Router)
    (auth)/              Public auth pages: /sign-in, /sign-up
    (dashboard)/         Logged-in pages: /dashboard
    api/auth/[...all]/   Better Auth API
    layout.tsx, page.tsx, globals.css
  components/
    ui/                  Small reusable pieces (Button, Input, Card...)
    layout/              Header, Sidebar, Footer...
  lib/
    prisma.ts            The single Prisma client:      import { prisma } from "@/lib/prisma"
    auth.ts              Better Auth, server side:      import { auth } from "@/lib/auth"
    auth-client.ts       Better Auth, browser side:     import { signIn, useSession } from "@/lib/auth-client"
    utils.ts             Small helpers (cn)
  server/
    actions/             Server actions ("use server"): create/update/delete
    queries/             Functions that read from the database
  hooks/                 React hooks (useSomething)
  types/                 Shared TypeScript types
  config/                App constants (site name, menu links...)
  generated/prisma/      Generated Prisma client (not in git)
  proxy.ts               Redirects to /sign-in if not logged in (Next 16 "middleware")
public/                  Images, icons, favicon
```

Folders in `( )` are route groups: they organize files but don't appear in the URL.

## Common tasks

**Get the user on the server** (server component, server action, route handler):

```ts
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

const session = await auth.api.getSession({ headers: await headers() });
if (!session) redirect("/sign-in");
```

**Get the user in a client component:**

```tsx
"use client";
import { useSession } from "@/lib/auth-client";
const { data: session, isPending } = useSession();
```

**Protect more pages:** add them to `matcher` in `src/proxy.ts`, and still check `getSession()` in the page.

**Add a table:** add a model at the bottom of `prisma/schema.prisma`, then run `npm run db:migrate -- --name add_something`.

**Add Google or GitHub login:** add `socialProviders` in `src/lib/auth.ts` (see https://www.better-auth.com/docs).

## Deploy on the VPS

```bash
npm ci
npm run db:deploy
npm run build
PORT=300x HOSTNAME=127.0.0.1 pm2 start npm --name <app> -- start
```

In the production `.env`, set `BETTER_AUTH_URL=https://www.your-domain.tn` and use a new `BETTER_AUTH_SECRET`.
