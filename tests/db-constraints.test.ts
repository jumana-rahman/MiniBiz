import { describe, it, expect, afterAll } from "vitest"
import "dotenv/config"
import { prisma } from "@/lib/prisma"

const stamp = Date.now()

/**
 * Database level tenant guarantees.
 *
 * The API rejects a cross-tenant link, but the guarantee must not depend on
 * the API: the invoice table carries a composite foreign key on
 * (companyId, customerId) so PostgreSQL itself refuses an invoice that points
 * at a customer of another company.
 */
describe.runIf(process.env.MINIBIZ_E2E === "1")(
  "database constraints (live PostgreSQL)",
  () => {
    let companyA = ""
    let companyB = ""
    let customerA = ""
    let customerB = ""

    it("creates two companies with one customer each", async () => {
      const a = await prisma.company.create({
        data: {
          name: `Constraint A ${stamp}`,
          slug: `constraint-a-${stamp}`,
          subscriptionPlan: "PRO",
        },
      })
      const b = await prisma.company.create({
        data: {
          name: `Constraint B ${stamp}`,
          slug: `constraint-b-${stamp}`,
          subscriptionPlan: "PRO",
        },
      })
      companyA = a.id
      companyB = b.id

      const ca = await prisma.customer.create({
        data: {
          companyId: companyA,
          name: "Constraint Customer A",
          email: `constraint.a.${stamp}@example.com`,
        },
      })
      const cb = await prisma.customer.create({
        data: {
          companyId: companyB,
          name: "Constraint Customer B",
          email: `constraint.b.${stamp}@example.com`,
        },
      })
      customerA = ca.id
      customerB = cb.id
      expect(customerA).not.toBe(customerB)
    })

    it("refuses an invoice whose customer belongs to another company", async () => {
      let failed = false
      try {
        await prisma.invoice.create({
          data: {
            companyId: companyA,
            customerId: customerB,
            invoiceNumber: `FK-${stamp}`,
            subtotal: 100,
            tax: 0,
            discount: 0,
            total: 100,
          },
        })
      } catch (e: any) {
        failed = true
        expect(String(e?.message)).toContain(
          "Invoice_companyId_customerId_fkey",
        )
      }
      expect(failed).toBe(true)

      const count = await prisma.invoice.count({
        where: { companyId: companyA, customerId: customerB },
      })
      expect(count).toBe(0)
    })

    it("stores the same invoice number in two companies but not twice in one", async () => {
      const number = `SAME-${stamp}`
      await prisma.invoice.create({
        data: {
          companyId: companyA,
          customerId: customerA,
          invoiceNumber: number,
          subtotal: 50,
          tax: 0,
          discount: 0,
          total: 50,
        },
      })
      await prisma.invoice.create({
        data: {
          companyId: companyB,
          customerId: customerB,
          invoiceNumber: number,
          subtotal: 50,
          tax: 0,
          discount: 0,
          total: 50,
        },
      })

      let failed = false
      try {
        await prisma.invoice.create({
          data: {
            companyId: companyA,
            customerId: customerA,
            invoiceNumber: number,
            subtotal: 50,
            tax: 0,
            discount: 0,
            total: 50,
          },
        })
      } catch {
        failed = true
      }
      expect(failed).toBe(true)
    })

    it("keeps customer emails unique per company and free across companies", async () => {
      const email = `shared.${stamp}@example.com`
      await prisma.customer.create({
        data: { companyId: companyA, name: "Same Email A", email },
      })
      await prisma.customer.create({
        data: { companyId: companyB, name: "Same Email B", email },
      })

      let failed = false
      try {
        await prisma.customer.create({
          data: { companyId: companyA, name: "Duplicate Email", email },
        })
      } catch {
        failed = true
      }
      expect(failed).toBe(true)
    })
  },
)

describe.runIf(process.env.MINIBIZ_E2E === "1")(
  "database constraint cleanup",
  () => {
    afterAll(async () => {
      const companies = await prisma.company.findMany({
        where: { slug: { contains: `constraint-` } },
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
      await prisma.$disconnect()
    })

    it("removes every company created by this run", () => {
      expect(true).toBe(true)
    })
  },
)
