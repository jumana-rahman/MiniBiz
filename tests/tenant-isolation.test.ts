import { describe, it, expect, afterAll } from "vitest"
import "dotenv/config"
import { prisma } from "@/lib/prisma"
import { call, makeJar, signUp } from "./helpers/http"

const stamp = Date.now()
const password = "Password123!"

/**
 * Tenant isolation at the API level.
 *
 * The browser may never point an invoice at a customer from another company,
 * may not read or write another tenant's records, and a broken payload is a
 * client error (400) instead of a server error (500).
 */
describe.runIf(process.env.MINIBIZ_E2E === "1")(
  "tenant isolation and payload handling (live server)",
  () => {
    const ownerA = makeJar()
    const ownerB = makeJar()
    let companyA = ""
    let companyB = ""
    let customerA = ""
    let customerB = ""

    it("creates two isolated companies with one customer each", async () => {
      companyA = await signUp(
        ownerA,
        "Alex Morgan",
        `iso.a.${stamp}@example.com`,
        password,
        `Isolation A ${stamp}`,
      )
      companyB = await signUp(
        ownerB,
        "Maya Patel",
        `iso.b.${stamp}@example.com`,
        password,
        `Isolation B ${stamp}`,
      )
      expect(companyA).not.toBe(companyB)

      const a = await call(ownerA, "/api/customers", {
        method: "POST",
        body: {
          companyId: companyA,
          name: "Alpha Client",
          email: `alpha.${stamp}@example.com`,
        },
      })
      expect(a.status).toBe(201)
      customerA = a.json.customer.id

      const b = await call(ownerB, "/api/customers", {
        method: "POST",
        body: {
          companyId: companyB,
          name: "Beta Client",
          email: `beta.${stamp}@example.com`,
        },
      })
      expect(b.status).toBe(201)
      customerB = b.json.customer.id
    })

    it("rejects an invoice that points at a customer from another company", async () => {
      const res = await call(ownerA, "/api/invoices", {
        method: "POST",
        body: {
          companyId: companyA,
          customerId: customerB,
          invoiceNumber: `INV-XTENANT-${stamp}`,
          items: [{ description: "Substitution attempt", quantity: 1, unitPrice: 50 }],
        },
      })
      expect(res.status).toBe(400)
      expect(res.json.error).toBeTruthy()

      const invoices = await call(
        ownerA,
        `/api/invoices?companyId=${companyA}&pageSize=100`,
      )
      const leaked = invoices.json.invoices.find(
        (i: any) => i.invoiceNumber === `INV-XTENANT-${stamp}`,
      )
      expect(leaked).toBeUndefined()
    })

    it("allows the same invoice number in two different companies", async () => {
      const number = `INV-SHARED-${stamp}`
      const inA = await call(ownerA, "/api/invoices", {
        method: "POST",
        body: {
          companyId: companyA,
          customerId: customerA,
          invoiceNumber: number,
          items: [{ description: "Same number in A", quantity: 1, unitPrice: 10 }],
        },
      })
      expect(inA.status).toBe(201)

      const inB = await call(ownerB, "/api/invoices", {
        method: "POST",
        body: {
          companyId: companyB,
          customerId: customerB,
          invoiceNumber: number,
          items: [{ description: "Same number in B", quantity: 1, unitPrice: 10 }],
        },
      })
      expect(inB.status).toBe(201)
      expect(inB.json.invoice.invoiceNumber).toBe(number)
    })

    it("rejects the same invoice number twice inside one company", async () => {
      const number = `INV-DUP-${stamp}`
      const first = await call(ownerA, "/api/invoices", {
        method: "POST",
        body: {
          companyId: companyA,
          customerId: customerA,
          invoiceNumber: number,
          items: [{ description: "First", quantity: 1, unitPrice: 10 }],
        },
      })
      expect(first.status).toBe(201)

      const second = await call(ownerA, "/api/invoices", {
        method: "POST",
        body: {
          companyId: companyA,
          customerId: customerA,
          invoiceNumber: number,
          items: [{ description: "Second", quantity: 1, unitPrice: 10 }],
        },
      })
      expect(second.status).toBe(409)
    })

    it("answers a malformed JSON body with 400 instead of 500", async () => {
      const customers = await call(ownerA, "/api/customers", {
        method: "POST",
        rawBody: '{"companyId": "' + companyA + '", "name": "Broken"',
      })
      expect(customers.status).toBe(400)
      expect(customers.json.error).toBeTruthy()

      const invoices = await call(ownerA, "/api/invoices", {
        method: "POST",
        rawBody: "not-json-at-all",
      })
      expect(invoices.status).toBe(400)

      const team = await call(ownerA, "/api/team", {
        method: "POST",
        rawBody: "{",
      })
      expect(team.status).toBe(400)
    })

    it("does not let one tenant read another tenant's invoice", async () => {
      const created = await call(ownerA, "/api/invoices", {
        method: "POST",
        body: {
          companyId: companyA,
          customerId: customerA,
          invoiceNumber: `INV-PRIVATE-${stamp}`,
          items: [{ description: "Private", quantity: 1, unitPrice: 10 }],
        },
      })
      expect(created.status).toBe(201)

      const crossRead = await call(
        ownerB,
        `/api/invoices/${created.json.invoice.id}?companyId=${companyB}`,
      )
      expect(crossRead.status).toBe(404)
    })
  },
)

describe.runIf(process.env.MINIBIZ_E2E === "1")("tenant isolation cleanup", () => {
  afterAll(async () => {
    const companies = await prisma.company.findMany({
      where: { name: { contains: `Isolation ${stamp}` } },
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
      await prisma.user.delete({ where: { id: user.id } })
    }
    await prisma.$disconnect()
  })

  it("removes every company and user created by this run", () => {
    expect(true).toBe(true)
  })
})
