import { describe, it, expect, afterAll } from "vitest"
import "dotenv/config"
import { prisma } from "@/lib/prisma"
import { call, makeJar, signUp, type Jar } from "./helpers/http"

const stamp = Date.now()
const password = "Password123!"

const owner = makeJar()
const staff = makeJar()
const viewer = makeJar()
const stranger = makeJar()
const admin = makeJar()

let companyId = ""
let strangerCompanyId = ""
let customerId = ""
let draftInvoiceId = ""
let superAdminUserId = ""

async function addMember(
  email: string,
  role: "STAFF" | "VIEWER",
): Promise<void> {
  const res = await call(owner, "/api/team", {
    method: "POST",
    body: { companyId, email, role },
  })
  if (res.status !== 201) {
    throw new Error(
      `could not add ${email} as ${role}: ${res.status} ${res.text}`,
    )
  }
}

describe.runIf(process.env.MINIBIZ_E2E === "1")(
  "MiniBiz roles and plans (SRS 11.2 / 11.4)",
  () => {
    it("builds a company with an owner, a staff member and a viewer", async () => {
      companyId = await signUp(
        owner,
        "Olivia Owner",
        `roles.owner.${stamp}@example.com`,
        password,
        `Roles Co ${stamp}`,
      )

      const staffEmail = `roles.staff.${stamp}@example.com`
      const viewerEmail = `roles.viewer.${stamp}@example.com`
      const strangerEmail = `roles.stranger.${stamp}@example.com`
      const adminEmail = `roles.admin.${stamp}@example.com`

      // Staff, viewer and stranger sign up first: SRS 3.2 / 11.2 — inviting a
      // member requires an existing account.
      await signUp(staff, "Sam Staff", staffEmail, password, `Staff Co ${stamp}`)
      await signUp(
        viewer,
        "Val Viewer",
        viewerEmail,
        password,
        `Viewer Co ${stamp}`,
      )
      strangerCompanyId = await signUp(
        stranger,
        "Sid Stranger",
        strangerEmail,
        password,
        `Stranger Co ${stamp}`,
      )
      await signUp(admin, "Sam Admin", adminEmail, password, `Admin Co ${stamp}`)

      await addMember(staffEmail, "STAFF")
      await addMember(viewerEmail, "VIEWER")

      const companies = await call(owner, "/api/companies")
      expect(companies.status).toBe(200)
      const company = companies.json.companies.find(
        (c: any) => c.id === companyId,
      )
      expect(company.role).toBe("OWNER")
      expect(company.plan).toBe("TRIAL")
    })

    it("gives the viewer read access but blocks every write", async () => {
      const created = await call(owner, "/api/customers", {
        method: "POST",
        body: {
          companyId,
          name: "Read Only Co",
          email: `readonly.${stamp}@example.com`,
        },
      })
      expect(created.status).toBe(201)
      customerId = created.json.customer.id

      const list = await call(viewer, `/api/customers?companyId=${companyId}`)
      expect(list.status).toBe(200)
      expect(list.json.customers.length).toBe(1)

      const read = await call(
        viewer,
        `/api/customers/${customerId}?companyId=${companyId}`,
      )
      expect(read.status).toBe(200)

      const createCustomer = await call(viewer, "/api/customers", {
        method: "POST",
        body: {
          companyId,
          name: "Viewer Attempt",
          email: `viewer.attempt.${stamp}@example.com`,
        },
      })
      expect(createCustomer.status).toBe(403)

      const updateCustomer = await call(
        viewer,
        `/api/customers/${customerId}?companyId=${companyId}`,
        { method: "PUT", body: { companyId, name: "Viewer Edited" } },
      )
      expect(updateCustomer.status).toBe(403)

      const createInvoice = await call(viewer, "/api/invoices", {
        method: "POST",
        body: {
          companyId,
          customerId,
          invoiceNumber: `VIEWER-${stamp}`,
          items: [{ description: "Viewer work", quantity: 1, unitPrice: 100 }],
        },
      })
      expect(createInvoice.status).toBe(403)
    })

    it("stops the viewer from issuing or editing an invoice", async () => {
      const draft = await call(owner, "/api/invoices", {
        method: "POST",
        body: {
          companyId,
          customerId,
          invoiceNumber: `DRAFT-${stamp}`,
          items: [{ description: "Design retainer", quantity: 1, unitPrice: 500 }],
        },
      })
      expect(draft.status).toBe(201)
      draftInvoiceId = draft.json.invoice.id

      const issue = await call(
        viewer,
        `/api/invoices/${draftInvoiceId}?companyId=${companyId}`,
        { method: "PUT", body: { companyId, status: "ISSUED" } },
      )
      expect(issue.status).toBe(403)

      const edit = await call(
        viewer,
        `/api/invoices/${draftInvoiceId}?companyId=${companyId}`,
        {
          method: "PUT",
          body: {
            companyId,
            items: [{ description: "Tampered", quantity: 1, unitPrice: 1 }],
          },
        },
      )
      expect(edit.status).toBe(403)

      const remove = await call(
        viewer,
        `/api/invoices/${draftInvoiceId}?companyId=${companyId}`,
        { method: "DELETE" },
      )
      expect(remove.status).toBe(403)

      const still = await call(
        owner,
        `/api/invoices/${draftInvoiceId}?companyId=${companyId}`,
      )
      expect(still.json.invoice.status).toBe("DRAFT")
    })

    it("lets staff work on customers and invoices but not the team", async () => {
      const createCustomer = await call(staff, "/api/customers", {
        method: "POST",
        body: {
          companyId,
          name: "Staff Managed Co",
          email: `staff.${stamp}@example.com`,
        },
      })
      expect(createCustomer.status).toBe(201)

      const createInvoice = await call(staff, "/api/invoices", {
        method: "POST",
        body: {
          companyId,
          customerId,
          invoiceNumber: `STAFF-${stamp}`,
          items: [{ description: "Staff work", quantity: 2, unitPrice: 125.5 }],
        },
      })
      expect(createInvoice.status).toBe(201)

      const issue = await call(
        staff,
        `/api/invoices/${createInvoice.json.invoice.id}?companyId=${companyId}`,
        { method: "PUT", body: { companyId, status: "ISSUED" } },
      )
      expect(issue.status).toBe(200)
      expect(issue.json.invoice.lockedAt).toBeTruthy()

      // SRS 3.2 — staff cannot manage users or company roles.
      const readTeam = await call(staff, `/api/team?companyId=${companyId}`)
      expect(readTeam.status).toBe(403)

      const invite = await call(staff, "/api/team", {
        method: "POST",
        body: {
          companyId,
          email: `roles.stranger.${stamp}@example.com`,
          role: "STAFF",
        },
      })
      expect(invite.status).toBe(403)
    })

    it("stops staff and viewers from changing the plan", async () => {
      const staffPlan = await call(staff, "/api/subscription", {
        method: "POST",
        body: { companyId, plan: "PRO" },
      })
      expect(staffPlan.status).toBe(403)

      const viewerPlan = await call(viewer, "/api/subscription", {
        method: "POST",
        body: { companyId, plan: "PRO" },
      })
      expect(viewerPlan.status).toBe(403)

      const company = await call(owner, "/api/companies")
      const current = company.json.companies.find((c: any) => c.id === companyId)
      expect(current.plan).toBe("TRIAL")
    })

    it("keeps a user out of a company they do not belong to", async () => {
      // Not a member of the company at all -> forbidden.
      const list = await call(stranger, `/api/customers?companyId=${companyId}`)
      expect(list.status).toBe(403)

      const read = await call(
        stranger,
        `/api/customers/${customerId}?companyId=${companyId}`,
      )
      expect(read.status).toBe(403)

      const dashboard = await call(
        stranger,
        `/api/dashboard?companyId=${companyId}`,
      )
      expect(dashboard.status).toBe(403)

      // Member of their own company, but the record lives elsewhere ->
      // not found, so the response never confirms it exists.
      const crossRead = await call(
        stranger,
        `/api/customers/${customerId}?companyId=${strangerCompanyId}`,
      )
      expect(crossRead.status).toBe(404)
    })

    it("serves the super admin console only to platform admins", async () => {
      const denied = await call(owner, "/api/admin")
      expect(denied.status).toBe(403)

      const session = await call(admin, "/api/auth/get-session")
      expect(session.status).toBe(200)
      superAdminUserId = session.json.user.id
      await prisma.platformAdmin.create({ data: { userId: superAdminUserId } })

      const allowed = await call(admin, "/api/admin")
      expect(allowed.status).toBe(200)
      expect(allowed.json.companies.length).toBeGreaterThan(0)
      expect(allowed.json.stats.totalCompanies).toBeGreaterThan(0)
      expect(allowed.json.planLimits.TRIAL.customers).toBe(5)

      const target = allowed.json.companies.find(
        (c: any) => c.id === companyId,
      )
      expect(target).toBeTruthy()
      expect(target.plan).toBe("TRIAL")

      const changed = await call(admin, "/api/admin", {
        method: "POST",
        body: { companyId, plan: "BASIC" },
      })
      expect(changed.status).toBe(200)
      expect(changed.json.company.subscriptionPlan).toBe("BASIC")

      const missing = await call(admin, "/api/admin", {
        method: "POST",
        body: { companyId: "does-not-exist", plan: "PRO" },
      })
      expect(missing.status).toBe(404)
    })

    it("keeps a plan downgrade from deleting records and blocks new ones", async () => {
      const before = await call(owner, `/api/dashboard?companyId=${companyId}`)
      expect(before.json.usage.customers.used).toBe(2)
      expect(before.json.usage.customers.limit).toBe(25)

      // Owner downgrades the company back to Trial (limit: 5 customers).
      const downgrade = await call(owner, "/api/subscription", {
        method: "POST",
        body: { companyId, plan: "TRIAL" },
      })
      expect(downgrade.status).toBe(200)
      expect(downgrade.json.company.plan).toBe("TRIAL")

      // Records survive the downgrade.
      const after = await call(owner, `/api/dashboard?companyId=${companyId}`)
      expect(after.json.usage.customers.used).toBe(2)
      expect(after.json.stats.customers).toBe(2)

      const customers = await call(owner, `/api/customers?companyId=${companyId}`)
      expect(customers.json.customers.length).toBe(2)

      // The new lower limit is enforced immediately.
      for (let i = 0; i < 3; i++) {
        const res = await call(owner, "/api/customers", {
          method: "POST",
          body: {
            companyId,
            name: `Filler ${i}`,
            email: `filler.${i}.${stamp}@example.com`,
          },
        })
        expect(res.status).toBe(201)
      }
      const blocked = await call(owner, "/api/customers", {
        method: "POST",
        body: {
          companyId,
          name: "Over Limit",
          email: `over.limit.${stamp}@example.com`,
        },
      })
      expect(blocked.status).toBe(403)
      expect(blocked.json.error).toBe("Subscription limit exceeded")
    })

    it("recalculates the total when a draft invoice is edited", async () => {
      const draft = await call(owner, "/api/invoices", {
        method: "POST",
        body: {
          companyId,
          customerId,
          invoiceNumber: `EDIT-${stamp}`,
          items: [{ description: "Placeholder", quantity: 1, unitPrice: 100 }],
        },
      })
      expect(draft.status).toBe(201)
      const id = draft.json.invoice.id
      expect(draft.json.invoice.total).toBe(100)

      const edited = await call(
        owner,
        `/api/invoices/${id}?companyId=${companyId}`,
        {
          method: "PUT",
          body: {
            companyId,
            items: [
              { description: "Consulting", quantity: 3, unitPrice: 125.5 },
              { description: "Hosting", quantity: 1, unitPrice: 24.25 },
            ],
            tax: 20,
            discount: 5,
          },
        },
      )
      expect(edited.status).toBe(200)
      expect(edited.json.invoice.subtotal).toBe(400.75)
      expect(edited.json.invoice.tax).toBe(20)
      expect(edited.json.invoice.discount).toBe(5)
      expect(edited.json.invoice.total).toBe(415.75)
      expect(edited.json.invoice.invoiceItems.length).toBe(2)
    })
  },
)

describe.runIf(process.env.MINIBIZ_E2E === "1")("roles cleanup", () => {
  afterAll(async () => {
    const companies = await prisma.company.findMany({
      where: { name: { contains: String(stamp) } },
      select: { id: true },
    })
    for (const company of companies) {
      await prisma.$transaction([
        prisma.invoiceItem.deleteMany({
          where: { invoice: { companyId: company.id } },
        }),
        prisma.invoice.deleteMany({ where: { companyId: company.id } }),
        prisma.customer.deleteMany({ where: { companyId: company.id } }),
        prisma.membership.deleteMany({ where: { companyId: company.id } }),
        prisma.company.delete({ where: { id: company.id } }),
      ])
    }
    const users = await prisma.user.findMany({
      where: { email: { contains: String(stamp) } },
      select: { id: true },
    })
    for (const user of users) {
      await prisma.platformAdmin.deleteMany({ where: { userId: user.id } })
      await prisma.session.deleteMany({ where: { userId: user.id } })
      await prisma.account.deleteMany({ where: { userId: user.id } })
      await prisma.user.delete({ where: { id: user.id } })
    }
    await prisma.$disconnect()
  })

  it("removes every company and user created by this run", () => {
    expect(true).toBe(true)
  })
})
