type DecimalLike = { toNumber(): number }

export function toNumber(
  value: DecimalLike | number | null | undefined,
): number {
  if (value === null || value === undefined) return 0
  if (typeof value === "number") return value
  return value.toNumber()
}

export type CustomerRecord = {
  id: string
  companyId: string
  name: string
  email: string
  phone: string | null
  address: string | null
  createdAt: Date
  updatedAt: Date
}

export type InvoiceItemRecord = {
  id: string
  invoiceId: string
  description: string
  quantity: DecimalLike
  unitPrice: DecimalLike
  lineTotal: DecimalLike
}

export type InvoiceRecord = {
  id: string
  companyId: string
  customerId: string
  invoiceNumber: string
  status: string
  invoiceDate: Date
  issuedAt: Date | null
  lockedAt: Date | null
  subtotal: DecimalLike
  tax: DecimalLike
  discount: DecimalLike
  total: DecimalLike
  currency: string
  notes: string | null
  createdAt: Date
  updatedAt: Date
  customer?: CustomerRecord | null
  invoiceItems?: InvoiceItemRecord[]
}

export function serializeCustomer(customer: CustomerRecord) {
  return {
    id: customer.id,
    companyId: customer.companyId,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  }
}

export function serializeInvoiceItem(item: InvoiceItemRecord) {
  return {
    id: item.id,
    invoiceId: item.invoiceId,
    description: item.description,
    quantity: toNumber(item.quantity),
    unitPrice: toNumber(item.unitPrice),
    lineTotal: toNumber(item.lineTotal),
  }
}

export function serializeInvoice(invoice: InvoiceRecord) {
  return {
    id: invoice.id,
    companyId: invoice.companyId,
    customerId: invoice.customerId,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    invoiceDate: invoice.invoiceDate,
    issuedAt: invoice.issuedAt,
    lockedAt: invoice.lockedAt,
    subtotal: toNumber(invoice.subtotal),
    tax: toNumber(invoice.tax),
    discount: toNumber(invoice.discount),
    total: toNumber(invoice.total),
    currency: invoice.currency,
    notes: invoice.notes,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
    customer: invoice.customer ? serializeCustomer(invoice.customer) : null,
    invoiceItems: (invoice.invoiceItems ?? []).map(serializeInvoiceItem),
  }
}
