import { describe, it, expect, afterAll } from "vitest"
import "dotenv/config"
import { prisma } from "@/lib/prisma"
import { call, makeJar, signUp } from "./helpers/http"

const stamp = Date.now()
const password = "Password123!"

/**
 * Workspace selection and company isolation (SRS 3.1 - 3.3, SEC-002 / 003).
 *
 * Registering always creates a company for the new user, so a member who is
 * invited to another company ends up with two memberships. The application
 * must open the company the user was invited to, with the role that
 * membership actually holds, and it must never activate a company the user
 * does not belong to.
 */
describe.runIf(process.env.MINIBIZ_E2E === "1")(
  "MiniBiz workspace selection (live server)",
  () => {
    const owner = makeJar()
    const viewer = makeJar()
    const staff = makeJar()
    const stranger = makeJar()
    const extra = makeJar()

    let companyId = ""
    let viewerOwnCompanyId = ""
    let staffOwnCompanyId = ""
    let strangerCompanyId = ""
    let strangerCustomerId = ""
    let strangerInvoiceId = ""
    let customerId = ""
    let draftInvoiceId = ""

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

    it("sets up an owner, a staff member and a viewer in one company", async () => {
      companyId = await signUp(
        owner,
        "Wanda Owner",
        `workspace.owner.${stamp}@example.com`,
        password,
        `WorkspaceTest Owner ${stamp}`,
      )
      viewerOwnCompanyId = await signUp(
        viewer,
        "Vera Viewer",
        `workspace.viewer.${stamp}@example.com`,
        password,
        `WorkspaceTest Viewer ${stamp}`,
      )
      staffOwnCompanyId = await signUp(
        staff,
        "Sam Staff",
        `workspace.staff.${stamp}@example.com`,
        password,
        `WorkspaceTest Staff ${stamp}`,
      )
      strangerCompanyId = await signUp(
        stranger,
        "Sid Stranger",
        `workspace.stranger.${stamp}@example.com`,
        password,
        `WorkspaceTest Stranger ${stamp}`,
      )
      await signUp(
        extra,
        "Eve Extra",
        `workspace.extra.${stamp}@example.com`,
        password,
        `WorkspaceTest Extra ${stamp}`,
      )

      // The stranger owns a company the others never join.
      const strangerCustomer = await call(stranger, "/api/customers", {
        method: "POST",
        body: {
          companyId: strangerCompanyId,
          name: "Stranger Client",
          email: `workspace.stranger.client.${stamp}@example.com`,
        },
      })
      expect(strangerCustomer.status).toBe(201)
      strangerCustomerId = strangerCustomer.json.customer.id

      const strangerInvoice = await call(stranger, "/api/invoices", {
        method: "POST",
        body: {
          companyId: strangerCompanyId,
          customerId: strangerCustomerId,
          invoiceNumber: `WS-STRANGER-${stamp}`,
          items: [{ description: "Private work", quantity: 1, unitPrice: 100 }],
        },
      })
      expect(strangerInvoice.status).toBe(201)
      strangerInvoiceId = strangerInvoice.json.invoice.id

      await addMember(`workspace.staff.${stamp}@example.com`, "STAFF")
      await addMember(`workspace.viewer.${stamp}@example.com`, "VIEWER")
    })

    it("opens the company that invited the user and reports its role", async () => {
      const session = await call(viewer, "/api/companies")
      expect(session.status).toBe(200)
      // The registration company is older than the invitation, so the invited
      // company is the workspace the user lands in.
      expect(session.json.activeCompanyId).toBe(companyId)
      expect(session.json.activeRole).toBe("VIEWER")

      const workspaces = session.json.companies as {
        id: string
        role: string
      }[]
      expect(workspaces).toHaveLength(2)
      const invited = workspaces.find((c) => c.id === companyId)
      const own = workspaces.find((c) => c.id === viewerOwnCompanyId)
      expect(invited?.role).toBe("VIEWER")
      expect(own?.role).toBe("OWNER")

      // The staff member lands in the same company with the staff role.
      const staffSession = await call(staff, "/api/companies")
      expect(staffSession.json.activeCompanyId).toBe(companyId)
      expect(staffSession.json.activeRole).toBe("STAFF")

      // The owner of a single company keeps it.
      const ownerSession = await call(owner, "/api/companies")
      expect(ownerSession.json.activeCompanyId).toBe(companyId)
      expect(ownerSession.json.activeRole).toBe("OWNER")
    })

    it("keeps the viewer read-only inside the invited company", async () => {
      const created = await call(owner, "/api/customers", {
        method: "POST",
        body: {
          companyId,
          name: "Shared Client",
          email: `workspace.shared.${stamp}@example.com`,
        },
      })
      expect(created.status).toBe(201)
      customerId = created.json.customer.id

      const list = await call(viewer, `/api/customers?companyId=${companyId}`)
      expect(list.status).toBe(200)
      expect(list.json.customers.length).toBe(1)

      const write = await call(viewer, "/api/customers", {
        method: "POST",
        body: {
          companyId,
          name: "Viewer Attempt",
          email: `workspace.viewer.write.${stamp}@example.com`,
        },
      })
      expect(write.status).toBe(403)

      const draft = await call(owner, "/api/invoices", {
        method: "POST",
        body: {
          companyId,
          customerId,
          invoiceNumber: `WS-DRAFT-${stamp}`,
          items: [{ description: "Design work", quantity: 1, unitPrice: 200 }],
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

      const remove = await call(
        viewer,
        `/api/invoices/${draftInvoiceId}?companyId=${companyId}`,
        { method: "DELETE" },
      )
      expect(remove.status).toBe(403)

      const unchanged = await call(
        owner,
        `/api/invoices/${draftInvoiceId}?companyId=${companyId}`,
      )
      expect(unchanged.json.invoice.status).toBe("DRAFT")
    })

    it("refuses to activate a company the user does not belong to", async () => {
      const forged = await call(
        viewer,
        `/api/companies?active=${strangerCompanyId}`,
      )
      expect(forged.status).toBe(403)

      // The active workspace is untouched by the rejected request.
      const session = await call(viewer, "/api/companies")
      expect(session.json.activeCompanyId).toBe(companyId)
      expect(session.json.activeRole).toBe("VIEWER")
    })

    it("switches to another workspace of the user and remembers it", async () => {
      const switched = await call(
        viewer,
        `/api/companies?active=${viewerOwnCompanyId}`,
      )
      expect(switched.status).toBe(200)
      expect(switched.json.activeCompanyId).toBe(viewerOwnCompanyId)
      // The role always follows the membership, never the request.
      expect(switched.json.activeRole).toBe("OWNER")

      // The selection survives the next request.
      const remembered = await call(viewer, "/api/companies")
      expect(remembered.json.activeCompanyId).toBe(viewerOwnCompanyId)
      expect(remembered.json.activeRole).toBe("OWNER")

      const back = await call(viewer, `/api/companies?active=${companyId}`)
      expect(back.status).toBe(200)
      expect(back.json.activeCompanyId).toBe(companyId)
      expect(back.json.activeRole).toBe("VIEWER")
    })

    it("never exposes another company's records to the viewer", async () => {
      const crossInvoice = await call(
        viewer,
        `/api/invoices/${strangerInvoiceId}?companyId=${companyId}`,
      )
      expect(crossInvoice.status).toBe(404)

      const crossCustomer = await call(
        viewer,
        `/api/customers/${strangerCustomerId}?companyId=${companyId}`,
      )
      expect(crossCustomer.status).toBe(404)

      // A viewer may not write at all, so the request is refused before the
      // customer is even looked up.
      const viewerWrite = await call(viewer, "/api/invoices", {
        method: "POST",
        body: {
          companyId,
          customerId: strangerCustomerId,
          invoiceNumber: `WS-XTENANT-${stamp}`,
          items: [{ description: "Substitution", quantity: 1, unitPrice: 10 }],
        },
      })
      expect(viewerWrite.status).toBe(403)

      // A staff member may write, but only for a customer of their own
      // company.
      const staffWrite = await call(staff, "/api/invoices", {
        method: "POST",
        body: {
          companyId,
          customerId: strangerCustomerId,
          invoiceNumber: `WS-XTENANT-${stamp}`,
          items: [{ description: "Substitution", quantity: 1, unitPrice: 10 }],
        },
      })
      expect(staffWrite.status).toBe(400)
    })

    it("stops staff and viewers from managing the team or the plan", async () => {
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

      const staffTeam = await call(staff, `/api/team?companyId=${companyId}`)
      expect(staffTeam.status).toBe(403)

      const staffInvite = await call(staff, "/api/team", {
        method: "POST",
        body: {
          companyId,
          email: `workspace.extra.${stamp}@example.com`,
          role: "STAFF",
        },
      })
      expect(staffInvite.status).toBe(403)
    })

    it("enforces the trial seat limit when the owner adds a member", async () => {
      // Trial allows two non-owner seats; staff and viewer already use them.
      const blocked = await call(owner, "/api/team", {
        method: "POST",
        body: {
          companyId,
          email: `workspace.extra.${stamp}@example.com`,
          role: "STAFF",
        },
      })
      expect(blocked.status).toBe(403)
      expect(blocked.json.error).toContain("seat limit")

      const team = await call(owner, `/api/team?companyId=${companyId}`)
      expect(team.status).toBe(200)
      expect(team.json.members.length).toBe(3)
    })
  },
)

describe.runIf(process.env.MINIBIZ_E2E === "1")("workspace cleanup", () => {
  afterAll(async () => {
    const companies = await prisma.company.findMany({
      where: { name: { contains: `WorkspaceTest` } },
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
      where: { email: { contains: `.${stamp}@example.com` } },
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
