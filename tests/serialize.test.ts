import { describe, it, expect } from "vitest"
import {
  toNumber,
  serializeCustomer,
  serializeInvoiceItem,
  serializeInvoice,
} from "@/lib/serialize"
import { toCents, fromCents, lineTotalCents } from "@/lib/money"

const dec = (v: number) => ({ toNumber: () => v })

const customer = {
  id: "cus_1",
  companyId: "co_1",
  name: "Northstar Coffee",
  email: "hello@northstar.test",
  phone: null,
  address: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-02"),
}

const invoice = {
  id: "inv_1",
  companyId: "co_1",
  customerId: "cus_1",
  invoiceNumber: "INV-001",
  status: "DRAFT",
  invoiceDate: new Date("2026-01-05"),
  issuedAt: null,
  lockedAt: null,
  subtotal: dec(3827.75),
  tax: dec(0),
  discount: dec(0),
  total: dec(3827.75),
  currency: "USD",
  notes: null,
  createdAt: new Date("2026-01-05"),
  updatedAt: new Date("2026-01-05"),
  customer,
  invoiceItems: [
    {
      id: "item_1",
      invoiceId: "inv_1",
      description: "Design retainer",
      quantity: dec(1),
      unitPrice: dec(3200),
      lineTotal: dec(3200),
    },
  ],
}

describe("decimal serialization", () => {
  it("converts decimal-like values to numbers", () => {
    expect(toNumber(dec(12.34))).toBe(12.34)
    expect(toNumber(5)).toBe(5)
    expect(toNumber(null)).toBe(0)
    expect(toNumber(undefined)).toBe(0)
  })

  it("keeps customer fields intact", () => {
    const out = serializeCustomer(customer)
    expect(out.id).toBe("cus_1")
    expect(out.name).toBe("Northstar Coffee")
    expect(out.phone).toBeNull()
  })

  it("converts invoice money fields to numbers", () => {
    const out = serializeInvoice(invoice)
    expect(out.total).toBe(3827.75)
    expect(out.subtotal).toBe(3827.75)
    expect(typeof out.total).toBe("number")
    expect(out.invoiceItems?.[0].lineTotal).toBe(3200)
    expect(typeof out.invoiceItems?.[0].unitPrice).toBe("number")
  })

  it("serializes line items independently", () => {
    const out = serializeInvoiceItem(invoice.invoiceItems![0])
    expect(out).toMatchObject({
      id: "item_1",
      description: "Design retainer",
      quantity: 1,
      unitPrice: 3200,
      lineTotal: 3200,
    })
  })

  it("returns an empty item list when items are missing", () => {
    const out = serializeInvoice({ ...invoice, invoiceItems: undefined })
    expect(out.invoiceItems).toEqual([])
  })

  it("nulls the customer when it is not included", () => {
    const out = serializeInvoice({ ...invoice, customer: undefined })
    expect(out.customer).toBeNull()
  })
})

describe("money helpers (SRS FR-022)", () => {
  it("round-trips through cents without float drift", () => {
    expect(fromCents(toCents(3827.75))).toBe(3827.75)
    expect(fromCents(toCents(0.1))).toBe(0.1)
    expect(fromCents(toCents(19.99))).toBe(19.99)
  })

  it("computes line totals in integer cents", () => {
    expect(lineTotalCents(5, toCents(125.55))).toBe(62775)
    expect(lineTotalCents(1, toCents(3200))).toBe(320000)
    expect(lineTotalCents(2.5, toCents(10))).toBe(2500)
  })
})
