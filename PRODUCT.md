# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Freelancers and solo owners** who run their own clients, invoices and projects alone, usually between client work.
- **Small agencies (2-20 people)**: an owner, a few admins and members sharing the same clients, projects and invoices.

Both use it as a daily work tool, mostly on a laptop, sometimes on a phone to check what's unpaid or due.

## Product Purpose

"One subscription. One dashboard. Everything a small business needs to track clients, invoice them, and manage the work — multi-tenant from day one."

Each company that signs up gets its own isolated workspace (contacts, projects, tasks, invoices, team) inside one shared app. Success: a new user creates a workspace, invites their team and sends a first invoice without reading any docs.

## Positioning

- **Simple, not bloated.** Only clients, invoices and work. Learnable in minutes, unlike HubSpot or Dolibarr.
- **Team-first.** Companies, roles (Owner, Admin, Member) and invitations are central, not an add-on.

## Operating Context

- One person can belong to several companies and switches between them (active company stored on the session).
- Invitations are sent by email link; for now the link is copied by hand (no email sending yet).
- Typical documents: invoices with line items, tax rate, totals, payments; company details printed on invoices (address, tax ID, logo).

## Capabilities and Constraints

- Built: sign up / sign in (Better Auth, email + password), create / switch / edit / delete company, members (change role, remove, leave), invitations (create, list, cancel, preview, accept), role checks on every route.
- Planned: contacts, projects + tasks (kanban), invoices + payments, dashboard KPIs, subscription plans (Free / Pro / Business, 14-day trial), Google sign-in, real invitation emails.
- Stack: Next.js 16 (App Router), Prisma 7 + PostgreSQL, Better Auth, Tailwind CSS 4.
- Language: international English UI.
- Open decision: default currency (the database default is currently TND; international positioning suggests letting each company pick, with no regional default).

## Brand Commitments

- Name: **BusinessFlow**. No logo or brand assets yet.

## Evidence on Hand

- No customers, testimonials, pricing or metrics yet. Do not invent them.
- Wireframes for the auth and multi-tenancy screens exist as a design canvas (private artifact).

## Product Principles

1. Fewer features, finished properly: every screen does one job well.
2. Roles are visible and honest: people see what they can do, and why something is unavailable.
3. A workspace is a team space: inviting and managing people is never more than one click away.
4. Money and data are exact: amounts, dates and statuses are never ambiguous.
