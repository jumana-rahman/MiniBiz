# MiniBiz

Multi-tenant business manager for small companies: customers, invoices, team
access and subscription plans, isolated per company.

Built from the MiniBiz Software Requirements Specification (SRS v1.0).

| | |
| --- | --- |
| Repository | <https://github.com/jumana-rahman/MiniBiz> |
| Live application | `https://<your-railway-domain>.up.railway.app` _(add after the Railway deploy — see [Deployment](#deployment-railway))_ |
| Database | PostgreSQL 14+ on Railway |
| Framework | Next.js 16.4.2 (App Router) · React 19.3 · TypeScript 5.7 · Tailwind CSS 4.3 |

---

## Table of contents

1. [What is implemented](#what-is-implemented)
2. [Stack](#stack)
3. [Getting started](#getting-started)
4. [Scripts](#scripts)
5. [Tests and actual test output](#tests-and-actual-test-output)
6. [Demo credentials](#demo-credentials)
7. [Security walkthrough script](#security-walkthrough-script)
8. [Deployment (Railway)](#deployment-railway)
9. [Domain model](#domain-model)
10. [API](#api)
11. [SRS traceability](#srs-traceability)
12. [Time spent](#time-spent)
13. [AI assistance disclosure](#ai-assistance-disclosure)

---

## What is implemented

- **Authentication and company registration** — email/password signup and login
  with better-auth (HTTP-only session cookies, hashed passwords). Registering a
  company creates the company, an `OWNER` membership and a **Trial** plan.
- **Customer management** — create, edit, delete, search and view customers.
  Email is unique per company. Deleting a customer with invoices is blocked.
- **Invoice management** — line items, **server-side** total calculation
  (subtotal + tax − discount), edit while `DRAFT`, issue to lock the financial
  details, unique invoice numbers per company.
- **Team and role management** — invite members, change roles, remove members
  (Owner only).
- **Subscription management** — plan catalogue, live usage counters, enforced
  limits on every write, plan changes that never delete existing records.
- **Company dashboard** — customers, invoices, revenue and plan usage for the
  selected company only.
- **Super Admin console** — protected platform area listing every company with
  live usage counts and simulated plan changes. A server-side route guard
  redirects non-administrators away, and the API answers `403`.
- **Multi-tenant isolation** — every API route resolves the caller's membership
  first; cross-tenant requests are rejected with `403`/`404`.
- **UI polish** — server-side pagination and search, loading/empty/error
  states, per-route `loading`/`error`/`not-found` boundaries, modal dialogs,
  status badges, Lucide icons, fully responsive layout.

---

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16.4.2 (App Router, React 19.3) |
| Language | TypeScript 5.7 |
| Database | PostgreSQL 14+ via Prisma 7.10 (`prisma-client` generator + `@prisma/adapter-pg`) |
| Auth | better-auth 1.7 (email + password, Prisma adapter) |
| Validation | Zod 4.6 |
| Icons | lucide-react 1.60 |
| Styling | Tailwind CSS 4.3 + `src/app/globals.css` (no UI component library) |
| Tests | Vitest 5.0 (unit + HTTP end-to-end) |

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure the environment

```bash
cp .env.example .env
```

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Secret used to sign sessions (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | Public app URL — must match the production domain, otherwise better-auth rejects the session cookie as a cross-origin request |

`.env.example` contains placeholders only. No real secrets are committed.

### 3. Create the database and seed it

```bash
npx prisma migrate deploy   # apply migrations
npm run seed                 # demo companies, users, customers and invoices
```

The seed is idempotent — it reuses existing rows, so it is safe to re-run.

### 4. Run the app

```bash
npm run dev
```

Open <http://localhost:3000>.

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests only (no server or database required) |
| `npm run test:e2e` | Unit **and** HTTP end-to-end tests (starts its own production server) |
| `npm run seed` | Seed demo data |
| `npm run clean:test-data` | Remove test tenants/users, keep the demo accounts |
| `npm run format` | Format the source with `oxfmt` |

`npm run test:e2e` **does not need a server to be running**. The global setup in
`tests/setup/e2e-server.ts` builds the app if the build is stale, picks a free
port, starts `next start` with a matching `BETTER_AUTH_URL`, waits until it
answers, and tears it down afterwards. Set `MINIBIZ_BASE_URL` to point the
tests at an already-running instance instead.

Both suites need a reachable PostgreSQL database (`DATABASE_URL`) and apply the
migrations with `npx prisma migrate deploy` before running.

---

## Tests and actual test output

The test suites cover the SRS §11 requirements directly.

| Suite | File | SRS coverage |
| --- | --- | --- |
| Unit | `tests/plans.test.ts` | §5 plan catalogue, limits and downgrade rules |
| Unit | `tests/security.test.ts` | §6 tenant-resolution and role guards |
| Unit | `tests/serialize.test.ts` | Decimal → number serialisation for JSON responses |
| API end-to-end | `tests/api.test.ts` | §11.1 tenant isolation, §11.3 invoice rules, §11.4 subscription limits |
| Roles | `tests/roles.test.ts` | §11.2 authentication/authorisation, §11.4 plan changes |
| Pagination | `tests/pagination.test.ts` | §9.1 pagination controls and search |

### `npm test` — unit tests

```
> minibiz@1.0.0 test
> vitest run


 RUN  v5.0.5 C:/Users/HP/minibiz


 Test Files  3 passed | 3 skipped (6)
      Tests  29 passed | 30 skipped (59)
   Start at  19:13:55
   Duration  7.77s (import 80%, transform 11%, tests 6%, worker 3%)
```

The three skipped files are the end-to-end suites — they only run when
`MINIBIZ_E2E=1` (set automatically by `npm run test:e2e`).

### `npm run test:e2e` — unit + end-to-end

```
[e2e] ▲ Next.js 16.4.2
[e2e] - Local:         http://localhost:60463
[e2e] ✓ Ready in 965ms
[e2e] Server ready at http://localhost:60463

 Test Files  6 passed (6)
      Tests  59 passed (59)
   Start at  19:14:10
   Duration  23.74s (tests 87%, import 10%, transform 2%, worker 1%)
```

**All 59 tests pass.** The run prints two Prisma `Unique constraint failed`
messages: these are *expected*. The tests deliberately create a duplicate
customer email and a duplicate invoice number to prove the database constraint
rejects them (SRS §11.3 — "Invoice numbers are unique within each company").

`npm run typecheck` and `npm run build` also complete successfully with the
same code.

---

## Demo credentials

> These accounts exist **only** for this assessment. They are created by
> `npm run seed` and share the throwaway password `password123`. Do not reuse
> any personal or production password.

| Role | Email | Password | Company |
| --- | --- | --- | --- |
| Company A — Owner | `owner@acmebloom.test` | `password123` | Acme & Bloom (Pro) |
| Company A — Staff | `staff@acmebloom.test` | `password123` | Acme & Bloom (Pro) |
| Company A — Viewer | `viewer@acmebloom.test` | `password123` | Acme & Bloom (Pro) |
| Company B — Owner | `owner@lumenworks.test` | `password123` | Lumen Works (Basic) |
| Super Admin | `admin@minibiz.test` | `password123` | Platform-wide console |

---

## Security walkthrough script

Record this while the app is running (≈6 minutes). Each step names the exact
click path and the expected result.

### 1. Unauthenticated access is blocked (SRS §11.2)

Open a private/incognito window and go to
`/dashboard`, `/customers`, `/invoices` and `/api/dashboard`.
**Expect:** every page redirects to `/login`, and every API call answers
`401`.

### 2. Cross-tenant read is blocked (SRS §11.1)

Sign in as **Company B Owner** (`owner@lumenworks.test`) and open
`/customers`. Only Lumen Works customers appear — no Acme & Bloom data.
Open `/api/customers?companyId=<Acme & Bloom company id>` in the same session.
**Expect:** `403` (or `404` for a record that does not exist in your tenant).

### 3. Cross-tenant write is blocked and leaves the record unchanged (SRS §11.1)

While signed in as Company B, open a Company A customer id in the URL and try
`DELETE /api/customers/<company-a-id>`.
**Expect:** `403`/`404`, and the Company A customer is still there when the
Owner checks the customer list.

### 4. A customer from another company cannot be used on an invoice (SRS §11.1)

While signed in as Company B, create a new invoice and try to select a
Company A customer.
**Expect:** the API answers `400 Invalid customer` — the invoice is not created
and no invoice row references a customer from another company.

### 5. Viewer is read-only (SRS §11.2)

Sign in as **Company A Viewer** (`viewer@acmebloom.test`).
**Expect:** the sidebar shows no *New customer* / *New invoice* buttons, and
`POST /api/customers`, `POST /api/invoices` and
`PUT /api/invoices/<id>` return `403` when called directly.

> Tip for the recording: the top bar has a **Viewer preview** toggle that lets
> an Owner see the read-only interface without switching accounts. It only
> hides the UI actions — the API still enforces the signed-in user's real role,
> so it is a demo aid, not a permission switch.

### 6. Staff cannot manage the team or the plan (SRS §11.2)

Sign in as **Company A Staff** (`staff@acmebloom.test`).
**Expect:** `/team` is not in the navigation and the Team screen shows
*"Owner access only"*. `GET /api/team` and `POST /api/subscription` return
`403` when called directly.

### 7. Owner cannot reach the Super Admin area (SRS §11.2)

Signed in as **Company A Owner**, open `/admin`.
**Expect:** the server-side route guard in `src/app/(app)/admin/layout.tsx`
redirects the browser back to `/dashboard` (Next.js issues it as a
meta-refresh, so the shell flashes for a moment), and `GET /api/admin`
returns `403`. No company data is ever rendered for the owner.

### 8. Super Admin has platform-level access only (SRS §3.4)

Sign in as **Super Admin** (`admin@minibiz.test`).
**Expect:** the console lists every company with live customer/invoice counts,
and the Super Admin can change a company's simulated plan. The Super Admin has
**no** company membership, so no customer or invoice data is exposed to them.

### 9. Issued invoices are locked (SRS §11.3)

Sign in as the Owner, open a `DRAFT` invoice → the line items are editable →
change a price → save → issue the invoice → reload the invoice.
**Expect:** the financial details are read-only and the API refuses any update
to an issued invoice.

### 10. Subscription limits are enforced server-side (SRS §11.4)

Sign in as Company B Owner (Basic plan: 25 customers / 100 invoices), then
use the browser devtools console to call the API directly with a
`POST /api/customers` request.
**Expect:** the limit is enforced by the server regardless of what the browser
sends; the UI is never the enforcement point.

---

## Deployment (Railway)

`railway.json` pins the build and start commands:

```json
{
  "build": { "builder": "NIXPACKS", "buildCommand": "npm ci && npx prisma generate && npm run build" },
  "deploy": { "startCommand": "npx prisma migrate deploy && npm run start" }
}
```

### Steps

1. **Push the code** — `git push origin main`.
2. **Create the project** — Railway dashboard → *New Project* → *Deploy from
   GitHub repo* → select `jumana-rahman/MiniBiz`.
3. **Provision PostgreSQL** — *Add service* → *Database* → *PostgreSQL*;
   Railway creates `DATABASE_URL` automatically.
4. **Set the environment variables** in the app service:
   - `DATABASE_URL` — the PostgreSQL service URL (auto-created)
   - `BETTER_AUTH_SECRET` — `openssl rand -base64 32`
   - `BETTER_AUTH_URL` — the public Railway domain, e.g.
     `https://minibiz-production.up.railway.app` (must match exactly)
5. **Deploy** — the build runs `npm ci && npx prisma generate && npm run build`
   and the start command applies the migrations with
   `npx prisma migrate deploy` before starting the server. This satisfies
   DEP-004: migrations are applied through the controlled deployment process,
   not by hand.
6. **Seed the demo data** once:
   ```bash
   railway run --service Postgres npx prisma migrate deploy
   railway run npm run seed
   ```
   (or run the seed from a local shell with `DATABASE_URL` pointing at the
   Railway database).
7. **Smoke test (DEP-007)** — open the public URL, log in with
   `owner@acmebloom.test` / `password123`, create a customer and an invoice,
   then sign in as `viewer@acmebloom.test` and confirm the write actions are
   gone.
8. **Update this README** — paste the live URL into the table at the top and
   into the demo section.

> DEP-009: no production secrets are in the repository. `.env` is gitignored
> and `.env.example` contains placeholders only.

---

## Domain model

- **Company** — the tenant. Owns customers, invoices and memberships, and
  carries the subscription plan.
- **Membership** — links a user to a company with a role. A user may belong to
  several companies; the app switches between them.
- **Customer** — belongs to exactly one company. Email is unique per company.
- **Invoice** — belongs to one company and one customer. Line items are stored
  separately. `DRAFT` invoices are editable, `ISSUED` invoices are locked.
  `tax` and `discount` are applied on the server.
- **PlatformAdmin** — grants access to the platform-wide Super Admin console.

### Roles

| Role | Read | Create / edit customers & invoices | Manage team | Change plan |
| --- | --- | --- | --- | --- |
| Owner | Yes | Yes | Yes | Own company |
| Staff | Yes | Yes | No | No |
| Viewer | Yes | No | No | No |
| Super Admin | All companies | — | — | Any company |

Every rule is enforced server-side in the API routes; the UI only mirrors it.
The **team area is Owner-only** — SRS §3.1 gives team management to the Owner,
while §3.2 (Staff) and §3.3 (Viewer) do not grant it, so `GET /api/team`
returns `403` for non-owners and the Team screen and nav entry are hidden
from them.

### Subscription plans

| Plan | Customers | Invoices | Seats | Price |
| --- | --- | --- | --- | --- |
| Trial | 5 | 10 | 2 | $0 |
| Basic | 25 | 100 | 10 | $19 |
| Pro | Unlimited | Unlimited | Unlimited | $49 |

Limits are defined once in `src/lib/plans.ts` and enforced on write. Lowering a
plan never deletes existing records — the company simply has to reduce usage
before it can create more.

---

## API

| Method & path | Purpose |
| --- | --- |
| `GET /api/companies` | Session user, memberships, platform-admin flag |
| `POST /api/auth/register-company` | Create a company for the signed-up user |
| `GET/POST /api/customers` | List / create customers (`?companyId=`, `?page=`, `?pageSize=`, `?q=`) |
| `GET/PUT/DELETE /api/customers/:id` | Read, update, delete a customer |
| `GET/POST /api/invoices` | List / create invoices (`?companyId=`, `?customerId=`, `?status=`, `?page=`, `?pageSize=`) |
| `GET/PUT/DELETE /api/invoices/:id` | Read, update, issue or delete an invoice |
| `GET/POST /api/team` | List members / invite a member (Owner only) |
| `PATCH/DELETE /api/team/:id` | Change a member's role / remove a member |
| `GET /api/dashboard` | Stats, plan usage and recent invoices |
| `GET/POST /api/subscription` | Owner reads and changes the own company's plan |
| `GET/POST /api/admin` | Super Admin company list and plan changes |

All endpoints require a valid session and verify that the caller belongs to
the company it is acting on. Requests for another tenant's resources are
rejected with `403`/`404`. Validation happens in the route handler with Zod
before any database write.

---

## SRS traceability

### Functional requirements (§4)

| Req | Summary | Where |
| --- | --- | --- |
| FR-001 – FR-003 | Secure registration, Owner membership, Trial plan on creation | `src/app/api/auth/[...all]/route.ts`, `src/app/api/auth/register-company/route.ts` |
| FR-004 – FR-007 | Membership/role storage, session-required pages and APIs, server-verified authorisation (browser-sent company IDs and roles are never trusted) | `src/lib/auth-helpers.ts`, `src/lib/auth.ts` |
| FR-008 – FR-015 | Customer list, create, detail, edit, Zod validation, company ownership, plan limit on create | `src/app/api/customers/route.ts`, `src/app/api/customers/[id]/route.ts` |
| FR-016 – FR-022 | Invoice creation, required fields, unique numbers per company, cross-company customer rejected, quantity/price validation, server-side totals in integer cents | `src/app/api/invoices/route.ts`, `src/lib/money.ts` |
| FR-023 – FR-029 | Invoice list/detail, draft editing, issuing, issued-invoice lock, rejection of unauthorised edits, plan limit, issued totals feed the dashboard | `src/app/api/invoices/route.ts`, `src/app/api/invoices/[id]/route.ts`, `src/app/api/dashboard/route.ts` |
| FR-030 – FR-038 | Three simulated plans, Trial default, centralised limits, server-side enforcement, downgrade preserves records, Super Admin plan simulation, no real payment gateway | `src/lib/plans.ts`, `src/app/api/subscription/route.ts`, `src/app/api/admin/route.ts` |
| FR-039 – FR-041 | Dashboard counts, issued-invoice value, plan usage — company-scoped and computed in SQL | `src/app/api/dashboard/route.ts` |
| FR-042 – FR-046 | Super Admin company list with usage, plan change, platform-level authorisation, Owners/Staff/Viewers denied | `src/app/api/admin/route.ts` |

### Multi-tenant security requirements (§6)

| Req | Summary | Where | Test |
| --- | --- | --- | --- |
| SEC-001 | Every customer and invoice is associated with a company | `prisma/schema.prisma` | `tests/security.test.ts` |
| SEC-002 | The server identifies the active company through a verified membership | `src/lib/auth-helpers.ts` | `tests/security.test.ts` |
| SEC-003 | Browser-supplied company IDs, user IDs and roles are never trusted for authorisation | `src/lib/auth-helpers.ts` | `tests/roles.test.ts` |
| SEC-004 | Every tenant-scoped query enforces the company boundary | all `src/app/api/*` routes | `tests/api.test.ts` |
| SEC-005 | Cross-company reads are denied | `src/lib/auth-helpers.ts` | `tests/api.test.ts`, `tests/roles.test.ts` |
| SEC-006 | Cross-company updates fail and leave the original record unchanged | `src/app/api/customers/[id]/route.ts`, `src/app/api/invoices/[id]/route.ts` | `tests/api.test.ts` |
| SEC-007 | Invoice creation rejects a customer from another company | `src/app/api/invoices/route.ts` | `tests/api.test.ts` |
| SEC-008 | Role checks are enforced server-side for every protected operation | `src/lib/auth-helpers.ts` | `tests/roles.test.ts` |
| SEC-009 | Viewer write attempts are rejected, including direct API calls | `src/app/api/customers/route.ts`, `src/app/api/invoices/route.ts` | `tests/roles.test.ts` |
| SEC-010 | Owners are denied platform-level Super Admin operations | `src/app/api/admin/route.ts` | `tests/roles.test.ts` |
| SEC-011 | Subscription limits are enforced server-side, independent of the UI | `src/lib/plans.ts` + write routes | `tests/api.test.ts`, `tests/roles.test.ts` |
| SEC-012 | No authentication secrets or production credentials in Git | `.gitignore` | — |
| SEC-013 | `.env.example` contains placeholders only | `.env.example` | — |
| SEC-014 | Issuing invoices and changing plans go through authorised server operations | `src/app/api/invoices/[id]/route.ts`, `src/app/api/subscription/route.ts`, `src/app/api/admin/route.ts` | `tests/roles.test.ts` |

### UI requirements (§9)

| Req | Summary | Where |
| --- | --- | --- |
| §9.1 | Responsive, Tailwind-only, reusable buttons/fields/tables/pagination/badges/modals/sidebar/stats, loading + empty + error states | `src/app/globals.css`, `src/components/*` |
| §9.2 | All required screens present | `src/app/(app)/*`, `src/app/login`, `src/app/register` |
| §9.2 | Navigation and actions reflect the role | `src/components/shell.tsx` |
| §10 | Zod validation on every write, safe error messages | `src/app/api/*/route.ts` |

### Testing requirements (§11)

| Req | Summary | Test |
| --- | --- | --- |
| §11.1 | Tenant isolation | `tests/api.test.ts`, `tests/roles.test.ts` |
| §11.2 | Authentication and authorisation | `tests/roles.test.ts` |
| §11.3 | Invoice rules | `tests/api.test.ts`, `tests/pagination.test.ts` |
| §11.4 | Subscription rules | `tests/api.test.ts`, `tests/roles.test.ts` |
| §11.5 | Runnable scripts, setup instructions, actual output in the README | this file, `tests/` |

### Deployment requirements (§12)

| Req | Summary | Where |
| --- | --- | --- |
| DEP-001 | Source in GitHub | <https://github.com/jumana-rahman/MiniBiz> |
| DEP-002 | Deployed to Railway | `railway.json` |
| DEP-003 | PostgreSQL on Railway | Railway PostgreSQL service |
| DEP-004 | Migrations applied in a controlled deployment | `railway.json` → `npx prisma migrate deploy && npm run start` |
| DEP-005 | Environment variables via Railway settings | deployment steps above |
| DEP-006 | Secure production auth, HTTPS | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` on the HTTPS domain |
| DEP-007 | Post-deployment smoke test | deployment step 7 |
| DEP-008 | Demo accounts from the seed script | `prisma/seed.ts` |
| DEP-009 | No real secrets in the repository | `.gitignore`, `.env.example` |

---

## Project structure

```
src/
  app/
    (app)/            Authenticated screens (dashboard, customers, invoices,
                      team, subscription, admin) + loading/error/not-found
    api/              Route handlers — the only place business rules live
    login, register   Public auth screens
  components/         Shell, invoice table, pagination, error banner, shared UI
  lib/
    auth.ts           better-auth instance
    auth-helpers.ts   Session, membership and platform-admin guards
    plans.ts          Plan catalogue and limits (client-safe)
    money.ts          Integer minor-unit money arithmetic
    pagination.ts     Shared page/pageSize parsing and totals
    routes.ts         Shared route map
    serialize.ts      Prisma Decimal → number for JSON responses
prisma/
  schema.prisma       Data model
  migrations/         Versioned SQL migrations
  seed.ts             Demo data
tests/
  setup/              Vitest global setup (starts the app for e2e)
  helpers/            Shared HTTP helpers
  api.test.ts         API end-to-end suite
  roles.test.ts       Role and subscription end-to-end suite
  pagination.test.ts  Pagination and search end-to-end suite
  plans.test.ts       Unit — plan catalogue and limits
  security.test.ts    Unit — tenant and role guards
  serialize.test.ts   Unit — Decimal serialisation
```

---

## Time spent

<!-- TODO(time): fill in the actual hours spent on the assessment. -->

Approximately **X hours** in total, broken down roughly as:

| Phase | Hours |
| --- | --- |
| Foundation, schema, auth, tenancy | X |
| Customers, invoices, server-side calculations | X |
| Subscriptions, team, dashboard, admin | X |
| Automated tests and fixes | X |
| UI polish, documentation, Railway deployment | X |

---

## AI assistance disclosure

This project was built with **significant AI assistance**. The AI tooling
(an AI pair-programming assistant running in the terminal) was used for:

- scaffolding the Next.js/Prisma/better-auth project and the initial data model;
- writing and refactoring application code (routes, components, Zod schemas,
  Prisma queries);
- writing the automated test suites and the global test setup;
- performing the SRS audit, and explaining the gaps it found;
- drafting this README, the walkthrough script and the traceability tables.

All generated code was reviewed, run, and verified by the author: the test
suites, `npm run typecheck` and `npm run build` are executed locally and their
real output is recorded above. The author made the design decisions — the
role matrix, the Owner-only team area, the plan limits, the pagination
behaviour, the money-as-integer-cents approach — and is accountable for the
final result.

No assessment credentials, production secrets or personal data were shared
with the AI tooling.
