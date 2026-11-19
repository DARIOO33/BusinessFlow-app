import { defineConfig } from "prisma/config";

// Prisma 7 does not read .env by itself. Load it if it exists (Node 20.12+).
try {
  process.loadEnvFile();
} catch {
  // no .env file: use the real environment variables
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
