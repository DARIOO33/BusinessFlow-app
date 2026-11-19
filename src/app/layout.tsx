import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Next Starter",
  description: "Next.js + Prisma 7 + PostgreSQL + Better Auth",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
