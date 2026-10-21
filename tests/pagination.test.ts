import { describe, it, expect, afterAll } from "vitest"
import "dotenv/config"
import { prisma } from "@/lib/prisma"
import { call, makeJar, signUp, type Jar } from "./helpers/http"

const stamp = Date.now()
const password = "Password123!"

const owner = makeJar()
let companyId = ""

describe.runIf(process.env.MINIBIZ_E2E === "1")(
  "MiniBiz pagination and search (SRS 9.1)",
  () => {
    it("sets up a company with enough records to page through", async () => {
      companyId = await signUp(
        owner,
        "Pat Pager",
        `pages.owner.${stamp}@example.com`,
        password,
        `Pages Co ${stamp}`,
      )

      for (const name of ["Alpha", "Beta", "Gamma"]) {
        const res = await call(owner, "/api/customers", {
          method: "POST",
          body: {
            companyId,
            name,
            email: `${name.toLowerCase()}.${stamp}@example.com`,
          },
        })
        expect(res.status).toBe(201)
      }
    })

    it("returns one page of customers with the totals for the pager", async () => {
      const first = await call(
        owner,
        `/api/customers?companyId=${companyId}&page=1&pageSize=2`,
      )
      expect(first.status).toBe(200)
      expect(first.json.customers.length).toBe(2)
      expect(first.json.pagination.page).toBe(1)
      expect(first.json.pagination.pageSize).toBe(2)
      expect(first.json.pagination.total).toBe(3)
      expect(first.json.pagination.totalPages).toBe(2)

      const second = await call(
        owner,
        `/api/customers?companyId=${companyId}&page=2&pageSize=2`,
      )
      expect(second.status).toBe(200)
      expect(second.json.customers.length).toBe(1)
      expect(second.json.pagination.page).toBe(2)

      // No customer is returned twice and none is skipped.
      const ids = new Set([
        ...first.json.customers.map((c: any) => c.id),
        ...second.json.customers.map((c: any) => c.id),
      ])
      expect(ids.size).toBe(3)
    })

    it("clamps a hostile page size instead of returning everything", async () => {
      const res = await call(
        owner,
        `/api/customers?companyId=${companyId}&pageSize=100000`,
      )
      expect(res.status).toBe(200)
      expect(res.json.pagination.pageSize).toBe(100)
      expect(res.json.customers.length).toBe(3)

      const bad = await call(
        owner,
        `/api/customers?companyId=${companyId}&page=0&pageSize=-5`,
      )
      expect(bad.status).toBe(200)
      expect(bad.json.pagination.page).toBe(1)
      expect(bad.json.pagination.pageSize).toBe(1)
    })

    it("filters the customer list by search term", async () => {
      const res = await call(
        owner,
        `/api/customers?companyId=${companyId}&q=beta`,
      )
      expect(res.status).toBe(200)
      expect(res.json.customers.length).toBe(1)
      expect(res.json.customers[0].name).toBe("Beta")
      expect(res.json.pagination.total).toBe(1)
    })

    it("pages and filters invoices by status", async () => {
      const customerId = (
        await call(owner, `/api/customers?companyId=${companyId}`)
      ).json.customers[0].id

      for (const number of ["P-1", "P-2", "P-3"]) {
        const res = await call(owner, "/api/invoices", {
          method: "POST",
          body: {
            companyId,
            customerId,
            invoiceNumber: `${number}-${stamp}`,
            items: [{ description: "Work", quantity: 1, unitPrice: 100 }],
          },
        })
        expect(res.status).toBe(201)
      }

      const drafts = await call(owner, `/api/invoices?companyId=${companyId}`)
      expect(drafts.status).toBe(200)
      expect(drafts.json.invoices.length).toBe(3)
      expect(drafts.json.counts.ALL).toBe(3)
      expect(drafts.json.counts.DRAFT).toBe(3)
      expect(drafts.json.counts.ISSUED).toBe(0)

      const first = await call(
        owner,
        `/api/invoices?companyId=${companyId}&page=1&pageSize=2`,
      )
      expect(first.json.invoices.length).toBe(2)
      expect(first.json.pagination.total).toBe(3)
      expect(first.json.pagination.totalPages).toBe(2)

      // Issuing one invoice moves it to the Issued tab.
      const issued = await call(
        owner,
        `/api/invoices/${first.json.invoices[0].id}?companyId=${companyId}`,
        { method: "PUT", body: { companyId, status: "ISSUED" } },
      )
      expect(issued.status).toBe(200)

      const issuedTab = await call(
        owner,
        `/api/invoices?companyId=${companyId}&status=ISSUED`,
      )
      expect(issuedTab.json.invoices.length).toBe(1)
      expect(issuedTab.json.counts.DRAFT).toBe(2)
      expect(issuedTab.json.counts.ISSUED).toBe(1)
      expect(issuedTab.json.pagination.total).toBe(1)
    })
  },
)

describe.runIf(process.env.MINIBIZ_E2E === "1")("pagination cleanup", () => {
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
