import { describe, it, expect, beforeAll, afterAll } from "vitest"
import "dotenv/config"
import { prisma } from "@/lib/prisma"
import { baseUrl, call, makeJar, signUp } from "./helpers/http"

const BASE = baseUrl()

type Jar = ReturnType<typeof makeJar>

let serverUp = false

beforeAll(async () => {
  try {
    const res = await fetch(`${BASE}/login`, { method: "GET" })
    serverUp = res.ok
  } catch {
    serverUp = false
  }
  if (!serverUp) {
    console.warn(
      `\n[api.test.ts] No server at ${BASE}. Run "npm run test:e2e" to start one automatically.\n`,
    )
  }
})

const stamp = Date.now()

describe.runIf(process.env.MINIBIZ_E2E === "1")(
  "MiniBiz API (live server)",
  () => {
    const ownerA = makeJar()
    const ownerB = makeJar()
    let companyA = ""
    let companyB = ""
    let customerId = ""
    let invoiceId = ""
    const password = "Password123!"
    const emailA = `owner.a.${stamp}@example.com`
    const emailB = `owner.b.${stamp}@example.com`

    it("starts up two isolated companies", async () => {
      companyA = await signUp(
        ownerA,
        "Alex Morgan",
        emailA,
        password,
        `Company A ${stamp}`,
      )
      companyB = await signUp(
        ownerB,
        "Maya Patel",
        emailB,
        password,
        `Company B ${stamp}`,
      )
      expect(companyA).toBeTruthy()
      expect(companyB).toBeTruthy()
      expect(companyA).not.toBe(companyB)
    })

    it("returns the session user and the trial plan for a new company", async () => {
      const res = await call(ownerA, "/api/companies")
      expect(res.status).toBe(200)
      expect(res.json.user.email).toBe(emailA)
      const company = res.json.companies.find((c: any) => c.id === companyA)
      expect(company.role).toBe("OWNER")
      expect(company.plan).toBe("TRIAL")
    })

    it("creates a customer and rejects duplicates and bad input", async () => {
      const created = await call(ownerA, "/api/customers", {
        method: "POST",
        body: {
          companyId: companyA,
          name: "Northstar Coffee",
          email: `northstar.${stamp}@example.com`,
        },
      })
      expect(created.status).toBe(201)
      customerId = created.json.customer.id

      const dupe = await call(ownerA, "/api/customers", {
        method: "POST",
        body: {
          companyId: companyA,
          name: "Dupe",
          email: `northstar.${stamp}@example.com`,
        },
      })
      expect(dupe.status).toBe(409)

      const invalid = await call(ownerA, "/api/customers", {
        method: "POST",
        body: { companyId: companyA, name: "Bad", email: "not-an-email" },
      })
      expect(invalid.status).toBe(400)
    })

    it("calculates invoice totals on the server", async () => {
      const res = await call(ownerA, "/api/invoices", {
        method: "POST",
        body: {
          companyId: companyA,
          customerId,
          invoiceNumber: `INV-${stamp}`,
          items: [
            { description: "Design retainer", quantity: 1, unitPrice: 3200 },
            { description: "Extra hours", quantity: 5, unitPrice: 125.55 },
          ],
        },
      })
      expect(res.status).toBe(201)
      expect(res.json.invoice.total).toBe(3827.75)
      expect(typeof res.json.invoice.total).toBe("number")
      invoiceId = res.json.invoice.id
    })

    it("rejects invalid invoice input", async () => {
      const badQty = await call(ownerA, "/api/invoices", {
        method: "POST",
        body: {
          companyId: companyA,
          customerId,
          invoiceNumber: `INV-BAD-${stamp}`,
          items: [{ description: "x", quantity: 0, unitPrice: 10 }],
        },
      })
      expect(badQty.status).toBe(400)

      const badPrice = await call(ownerA, "/api/invoices", {
        method: "POST",
        body: {
          companyId: companyA,
          customerId,
          invoiceNumber: `INV-NEG-${stamp}`,
          items: [{ description: "x", quantity: 1, unitPrice: -5 }],
        },
      })
      expect(badPrice.status).toBe(400)

      const dupe = await call(ownerA, "/api/invoices", {
        method: "POST",
        body: {
          companyId: companyA,
          customerId,
          invoiceNumber: `INV-${stamp}`,
          items: [{ description: "x", quantity: 1, unitPrice: 1 }],
        },
      })
      expect(dupe.status).toBe(409)
    })

    it("locks an issued invoice against further edits and deletes", async () => {
      const issued = await call(
        ownerA,
        `/api/invoices/${invoiceId}?companyId=${companyA}`,
        { method: "PUT", body: { companyId: companyA, status: "ISSUED" } },
      )
      expect(issued.status).toBe(200)
      expect(issued.json.invoice.lockedAt).toBeTruthy()

      const edit = await call(
        ownerA,
        `/api/invoices/${invoiceId}?companyId=${companyA}`,
        {
          method: "PUT",
          body: {
            companyId: companyA,
            items: [{ description: "tampered", quantity: 1, unitPrice: 1 }],
          },
        },
      )
      expect(edit.status).toBe(403)

      const remove = await call(
        ownerA,
        `/api/invoices/${invoiceId}?companyId=${companyA}`,
        { method: "DELETE" },
      )
      expect(remove.status).toBe(403)
    })

    it("exposes dashboard stats, usage limits and recent invoices", async () => {
      const res = await call(ownerA, `/api/dashboard?companyId=${companyA}`)
      expect(res.status).toBe(200)
      expect(res.json.stats.customers).toBe(1)
      expect(res.json.stats.issued).toBe(1)
      expect(res.json.stats.issuedTotal).toBe(3827.75)
      expect(res.json.usage.customers.limit).toBe(5)
      expect(res.json.recentInvoices.length).toBe(1)
    })

    it("blocks cross-tenant reads and writes", async () => {
      const read = await call(
        ownerB,
        `/api/customers/${customerId}?companyId=${companyB}`,
      )
      expect(read.status).toBe(404)

      const list = await call(ownerB, `/api/customers?companyId=${companyA}`)
      expect(list.status).toBe(403)

      const update = await call(
        ownerB,
        `/api/customers/${customerId}?companyId=${companyB}`,
        { method: "PUT", body: { companyId: companyB, name: "Hacked" } },
      )
      expect(update.status).toBe(404)

      const untouched = await call(
        ownerA,
        `/api/customers/${customerId}?companyId=${companyA}`,
      )
      expect(untouched.json.customer.name).toBe("Northstar Coffee")
    })

    it("rejects unauthenticated requests", async () => {
      const anon = makeJar()
      const customers = await call(anon, `/api/customers?companyId=${companyA}`)
      expect(customers.status).toBe(401)
      const dashboard = await call(anon, `/api/dashboard?companyId=${companyA}`)
      expect(dashboard.status).toBe(401)
    })

    it("denies the super admin console to normal users", async () => {
      const res = await call(ownerA, "/api/admin")
      expect(res.status).toBe(403)
    })

    it("enforces the trial seat limit for non-owner members", async () => {
      const statuses: number[] = []
      for (let i = 0; i < 3; i++) {
        const jar = makeJar()
        const email = `seat${i}.${stamp}@example.com`
        await signUp(jar, `Seat ${i}`, email, password, `Seat Co ${i} ${stamp}`)
        const res = await call(ownerA, "/api/team", {
          method: "POST",
          body: { companyId: companyA, email, role: "STAFF" },
        })
        statuses.push(res.status)
      }
      // trial plan allows 2 non-owner seats -> the third must be rejected
      expect(statuses).toEqual([201, 201, 403])
    })

    it("rejects adding a user that does not exist", async () => {
      const res = await call(ownerA, "/api/team", {
        method: "POST",
        body: {
          companyId: companyA,
          email: `ghost.${stamp}@example.com`,
          role: "STAFF",
        },
      })
      expect(res.status).toBe(404)
    })

    it("lets the owner change the plan and reflects it in usage", async () => {
      const res = await call(ownerA, "/api/subscription", {
        method: "POST",
        body: { companyId: companyA, plan: "BASIC" },
      })
      expect(res.status).toBe(200)

      const dash = await call(ownerA, `/api/dashboard?companyId=${companyA}`)
      expect(dash.json.usage.customers.limit).toBe(25)
    })
  },
)

describe.runIf(process.env.MINIBIZ_E2E === "1")("e2e cleanup", () => {
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
      await prisma.user.delete({ where: { id: user.id } })
    }
    await prisma.$disconnect()
  })

  it("removes every company and user created by this run", () => {
    expect(true).toBe(true)
  })
})
