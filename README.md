# MiniBiz — Multi-Tenant Business Manager

A multi-tenant business management application for small companies, built for the NEW IT BIZ Practical Developer Assessment.

**Repository:** https://github.com/jumana-rahman/MiniBiz  
**Live application:** Pending Railway deployment  
**Database:** PostgreSQL

## Features

- **Authentication:** Email/password registration and login using Better Auth.
- **Company management:** Company registration and membership-based workspace access.
- **Roles:** Owner, Staff, and Viewer permissions enforced on the server.
- **Customers:** Create, view, search, update, and delete company-specific customers.
- **Invoices:** Create and edit draft invoices, calculate totals on the server, and issue invoices with locked financial details.
- **Subscriptions:** Trial, Basic, and Pro plans with server-enforced usage limits and simulated plan changes.
- **Dashboard:** Company-specific customer and invoice statistics, including issued invoice value—not payments received.
- **Super Admin:** Platform-level company overview, usage counts, and simulated plan management.
- **Tenant isolation:** Cross-company access is rejected, including attempts to use another company's customer on an invoice.
- **Responsive UI:** Search, pagination, loading/error states, and role-aware navigation.

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js, React, TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | Better Auth |
| Validation | Zod |
| Testing | Vitest, HTTP end-to-end tests |

## Getting Started

### Requirements
Node.js, npm, and PostgreSQL.

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and configure:

- `DATABASE_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` — a secure random secret
- `BETTER_AUTH_URL` — application URL, such as `http://localhost:3000`

Use your own local database and never commit `.env` or real secrets.

### 3. Apply migrations and seed demo data

```bash
npx prisma migrate deploy
npm run seed
```

### 4. Start the application

```bash
npm run dev
```

Open http://localhost:3000.

## Available Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Create production build |
| `npm start` | Start production build |
| `npm run typecheck` | Check TypeScript types |
| `npm test` | Run unit tests |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run seed` | Create demo data |

End-to-end tests require a reachable PostgreSQL database configured through `DATABASE_URL`.

## Demo Accounts

The seed script provides accounts for testing the role and tenant-isolation requirements.

| Role | Email | Company / Access |
|---|---|---|
| Owner | `owner@acmebloom.test` | Acme & Bloom |
| Staff | `staff@acmebloom.test` | Acme & Bloom |
| Viewer | `viewer@acmebloom.test` | Acme & Bloom |
| Owner | `owner@lumenworks.test` | Lumen Works |
| Super Admin | `admin@minibiz.test` | Platform administration |

Demo credentials are for assessment use only. The password is shared privately with the assessor rather than published in this repository.

## Roles and Subscription Plans

| Role | Permissions |
|---|---|
| Owner | Manage company customers, invoices, team, and subscription |
| Staff | Manage customers and invoices; cannot manage the team or plan |
| Viewer | Read-only access to company data |
| Super Admin | View companies and manage simulated plans at platform level |

| Plan | Customer Limit | Invoice Limit | Non-owner Seat Limit |
|---|---:|---:|---:|
| Trial | 5 | 10 | 2 |
| Basic | 25 | 100 | 10 |
| Pro | Unlimited | Unlimited | Unlimited |

Limits are enforced by the server, not only by the interface. Plan changes do not delete existing records.

## Security and Testing

Automated tests cover authentication and role checks, tenant isolation, invoice rules, subscription limits, pagination, and database constraints.

Latest recorded results:

- **Unit tests:** 41 passed; 51 skipped in the unit-test run.
- **End-to-end tests:** 92 passed.
- **TypeScript check:** Passed.
- **Production build:** Passed.

The skipped unit-test cases run in the end-to-end test configuration. Re-run the commands before submission if the code changes, and update these results if the output differs.

### Required assessment scenarios

The walkthrough and tests should demonstrate:

1. Company A and Company B cannot access each other's records.
2. Cross-company reads and updates are rejected.
3. An invoice cannot reference another company's customer.
4. Viewer write requests are rejected by the API.
5. Staff cannot manage team members or subscriptions.
6. Owners cannot access Super Admin operations.
7. Invoice totals are calculated server-side and issued invoices cannot be edited.
8. Subscription limits are enforced server-side.
9. Super Admin can view companies and change simulated plans.
10. Dashboard data is scoped to the selected company.

See `WALKTHROUGH.md` for the step-by-step demonstration and evidence checklist.

## Deployment

The application is intended to be deployed on Railway with a PostgreSQL database.

**Deployment status:** Pending verification. The live URL will be added after successful deployment.

## Known Limitations

- Subscription plans are simulated; no real payment gateway is integrated.
- Trial does not expire automatically.
- Invitations do not send email; invitees must register first.
- Issued invoices are locked; voiding and credit-note workflows are not included.


## Time Spent

Estimated active development time: approximately **23 hours** across October 20–22, 2026.

This includes implementation, testing, debugging, UI improvements, and documentation.
