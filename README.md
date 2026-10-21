# MiniBiz

Multi-tenant business manager for small companies: customers, invoices, team
access and subscription plans, isolated per company.

Built from the MiniBiz Software Requirements Specification (SRS v1.0).

---

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16.4.2 (App Router, React 19.3, Turbopack) |
| Language | TypeScript 5.7 |
| Database | PostgreSQL 14+ via Prisma 7.10 (`prisma-client` generator + `@prisma/adapter-pg`) |
| Auth | better-auth 1.7 (email + password, Prisma adapter) |
| Validation | Zod 4.6 |
| Styling | Tailwind CSS 4.3 + `src/app/globals.css` |
| Tests | Vitest 5.0 |

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
| `BETTER_AUTH_URL` | Public app URL — must match the production domain |

### 3. Create the database and seed it

```bash
npx prisma migrate deploy   # apply migrations
npm run seed                 # demo companies, users, customers and invoices
```

### 4. Run the app

```bash
npm run dev
```

Open <http://localhost:3000>.

### Demo accounts

All demo accounts use the password `password123`.

| Account | Role | Company |
| --- | --- | --- |
| `owner@acmebloom.test` | Owner | Acme & Bloom (Pro) |
| `staff@acmebloom.test` | Staff | Acme & Bloom (Pro) |
| `viewer@acmebloom.test` | Viewer | Acme & Bloom (Pro) |
| `owner@lumenworks.test` | Owner | Lumen Works (Basic) |
| `admin@minibiz.test` | Super Admin | Platform-wide console |

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests (no server or database required) |
| `npm run test:e2e` | API integration tests against a running server |
| `npm run seed` | Seed demo data |
| `npm run format` | Format the source with `oxfmt` |

`npm run test:e2e` expects the dev server to be running on
<http://localhost:3000> (override with `MINIBIZ_BASE_URL`). It creates its own
tenants and removes them again afterwards.

---

## Domain model

- **Company** — the tenant. Owns customers, invoices and memberships, and
  carries the subscription plan.
- **Membership** — links a user to a company with a role. A user may belong to
  several companies; the app switches between them.
- **Customer** — belongs to exactly one company. Email is unique per company.
- **Invoice** — belongs to one company and one customer. Line items are stored
  separately. `DRAFT` invoices are editable, `ISSUED` invoices are locked.
- **PlatformAdmin** — grants access to the platform-wide Super Admin console.

### Roles

| Role | Read | Create / edit customers & invoices | Manage team | Change plan |
| --- | --- | --- | --- | --- |
| Owner | Yes | Yes | Yes | Own company |
| Staff | Yes | Yes | No | No |
| Viewer | Yes | No | No | No |
| Super Admin | All companies | — | — | Any company |

Every rule is enforced server-side in the API routes; the UI only mirrors it.

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

## Project structure

```
src/
  app/
    (app)/            Authenticated screens (dashboard, customers, invoices,
                      team, subscription, admin)
    api/              Route handlers — the only place business rules live
    login, register   Public auth screens
  components/         Shell, invoice table, auth screen, shared UI
  lib/
    auth.ts           better-auth instance
    auth-helpers.ts   Session, membership and platform-admin guards
    plans.ts          Plan catalogue and limits (client-safe)
    money.ts          Integer minor-unit money arithmetic
    serialize.ts      Prisma Decimal → number for JSON responses
    routes.ts         Shared route map
prisma/
  schema.prisma       Data model
  seed.ts             Demo data
tests/                Vitest suites
```

---

## API

| Method & path | Purpose |
| --- | --- |
| `GET /api/companies` | Session user, memberships, platform-admin flag |
| `POST /api/auth/register-company` | Create a company for the signed-up user |
| `GET/POST /api/customers` | List / create customers (`?companyId=`) |
| `GET/PUT/DELETE /api/customers/:id` | Read, update, delete a customer |
| `GET/POST /api/invoices` | List / create invoices (`?companyId=`, `?customerId=`) |
| `GET/PUT/DELETE /api/invoices/:id` | Read, update, issue or delete an invoice |
| `GET/POST /api/team` | List members / invite a member |
| `PATCH/DELETE /api/team/:id` | Change a member's role / remove a member |
| `GET /api/dashboard` | Stats, plan usage and recent invoices |
| `POST /api/subscription` | Owner changes the own company's plan |
| `GET/POST /api/admin` | Super Admin company list and plan changes |

All endpoints require a valid session and verify that the caller belongs to
the company it is acting on. Requests for another tenant's resources are
rejected with `403`/`404`.

---

## Deployment (Railway)

1. Push the repository to GitHub and create a Railway project from it.
2. Add a PostgreSQL service and point `DATABASE_URL` at it.
3. Set `BETTER_AUTH_SECRET` (generate with `openssl rand -base64 32`) and
   `BETTER_AUTH_URL` to the Railway domain.
4. Railway uses `railway.json`: it runs `npm ci && npx prisma generate && npm run build`
   and starts the app with `npm run start`.
5. Apply the schema and seed the demo data once:

   ```bash
   npx prisma migrate deploy
   npm run seed
   ```
