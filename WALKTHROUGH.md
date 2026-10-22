# MiniBiz — Assessment Walkthrough

**Repository:** https://github.com/jumana-rahman/MiniBiz  
**Live application:** Pending Railway deployment  
**Database:** PostgreSQL

This walkthrough demonstrates the main features, role permissions, tenant isolation, and security controls implemented in MiniBiz.

## 1. Authentication and Company Workspaces

**Demo account:** `owner@acmebloom.test`

1. Open the application and sign in as the Company A Owner.
2. Confirm that the user reaches the dashboard for **Acme & Bloom**.
3. Sign out and sign in as `owner@lumenworks.test`.
4. Confirm that the second account opens the **Lumen Works** workspace.

**Expected result:** Each owner accesses their own company workspace. Company registration creates an Owner membership and starts the company on the Trial plan.

## 2. Customer Management and Tenant Isolation

Use the two company owner accounts to compare their customer lists and verify tenant isolation.

1. Sign in as the Acme & Bloom Owner and open Customers.
2. Create a test customer and confirm it appears in that workspace.
3. Sign in as the Lumen Works Owner and inspect Customers.
4. Confirm that Acme & Bloom's customer is not visible in Lumen Works.
5. While logged in as the Acme & Bloom Owner, open a customer URL belonging to Lumen Works.

**Expected result:**

- Each company sees only its own customer records.
- Opening another company's customer URL does not reveal that customer's details; the page shows no customer.
- Attempts to access or update another company's customer must be rejected by the server, and the other company's record must remain unchanged.

The page does not need to display a `403` or `404` error message for tenant isolation to work. The important requirement is that unauthorized data is not exposed and unauthorized changes are prevented. API-level responses should be verified separately when testing directly.

## 4. Role-Based Access Control

### Owner

Sign in as `owner@acmebloom.test`.

Verify that the Owner can manage customers and invoices and access authorized team and subscription functions.

### Staff

Sign in as `staff@acmebloom.test`.

Verify the permitted customer and draft-invoice operations. Staff must not be able to manage team membership or change the company subscription.

Where possible, test restricted API endpoints directly rather than relying only on hidden buttons or navigation.

### Viewer

Sign in as `viewer@acmebloom.test`.

Verify that the Viewer can access permitted company data but cannot create, edit, or delete records.

Test write endpoints directly where possible and confirm that prohibited operations do not modify data.

**Expected result:** Permissions are enforced on the server, even when a user attempts a restricted operation without using the interface. The UI does not have to display an error message for every denied operation; verify the actual API response when documenting HTTP status codes.

## 7. Super Admin Console

Sign in as `admin@minibiz.test`.

1. Open `/admin`.
2. Confirm that the platform-level console lists companies and their usage counts.
3. Verify that the Super Admin can change a company's simulated subscription plan.
4. Check that the Super Admin does not receive ordinary company customer or invoice data through normal tenant endpoints.

Next, sign out and sign in as `owner@acmebloom.test`.

5. Attempt to open `/admin`.
6. Confirm that the Owner is redirected to their own dashboard.
7. Where possible, request the admin API directly while authenticated as the Owner.

**Expected result:**

- The Super Admin can access platform-level company information and simulated plan controls.
- An ordinary Owner is redirected to their own dashboard instead of being shown the Super Admin console.
- The interface does not need to display a `403` error message. Verify the admin API's actual response separately to confirm that it rejects unauthorized requests and does not expose platform-level data.
- The Super Admin does not have a company membership and should not receive company customer or invoice data through normal tenant endpoints.


## 8. Automated Test Results

The latest recorded results available during preparation of this walkthrough were:

| Check | Recorded result |
|---|---|
| `npm test` | 41 passed, 51 skipped |
| `npm run test:e2e` | 92 passed |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |

These are recorded results, not a claim that the commands were rerun after every subsequent change. Rerun the checks before submission if the code changes.

Some Prisma constraint errors may appear during tests that deliberately attempt duplicate records or cross-company relationships. Confirm the corresponding tests pass and the invalid operations are rejected.

**Known limitations:** Payments are simulated; issued invoices are locked, but payment collection is not integrated. The Trial period does not automatically expire. Email delivery and invoice voiding or credit notes are not implemented.

