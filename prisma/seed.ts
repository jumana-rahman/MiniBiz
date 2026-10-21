/**
 * Demo data seed — SRS §12 (Priority 4: "Provide seed data for demo accounts").
 *
 * Creates a realistic multi-tenant dataset:
 *   - 1 Super Admin (platform owner)
 *   - 2 companies with different subscription plans
 *   - owners, staff and viewer members
 *   - customers and invoices in DRAFT and ISSUED states
 *
 * Run with:  npm run seed
 * Every account uses the password: password123
 */
import "dotenv/config"
import { prisma } from "../src/lib/prisma"
import { auth } from "../src/lib/auth"
import { toCents, fromCents, lineTotalCents } from "../src/lib/money"
import {
  Role,
  InvoiceStatus,
  SubscriptionPlan,
} from "../src/generated/prisma/enums"

const PASSWORD = "password123"

type SeedUser = {
  name: string
  email: string
}

async function ensureUser({ name, email }: SeedUser) {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return existing

  const result = await auth.api.signUpEmail({
    body: { name, email, password: PASSWORD },
  })
  if (!result?.user?.id) {
    throw new Error(`Could not create user ${email}`)
  }
  return prisma.user.findUniqueOrThrow({ where: { email } })
}

async function ensureCompany(
  name: string,
  slug: string,
  plan: SubscriptionPlan,
) {
  const existing = await prisma.company.findUnique({ where: { slug } })
  if (existing) return existing
  return prisma.company.create({
    data: { name, slug, subscriptionPlan: plan },
  })
}

async function ensureMembership(userId: string, companyId: string, role: Role) {
  const existing = await prisma.membership.findFirst({
    where: { userId, companyId },
  })
  if (existing) return existing
  return prisma.membership.create({
    data: { userId, companyId, role },
  })
}

type CustomerSeed = {
  name: string
  email: string
  phone?: string
  address?: string
}

async function ensureCustomer(companyId: string, data: CustomerSeed) {
  const existing = await prisma.customer.findFirst({
    where: { companyId, email: data.email },
  })
  if (existing) return existing
  return prisma.customer.create({
    data: {
      companyId,
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      address: data.address ?? null,
    },
  })
}

type SeedInvoiceItem = {
  description: string
  quantity: number
  unitPrice: number
}

type SeedInvoice = {
  invoiceNumber: string
  status: InvoiceStatus
  items: SeedInvoiceItem[]
  tax?: number
  discount?: number
  notes?: string
}

async function ensureInvoice(
  companyId: string,
  customerId: string,
  seed: SeedInvoice,
) {
  const existing = await prisma.invoice.findFirst({
    where: { companyId, invoiceNumber: seed.invoiceNumber },
  })
  if (existing) return existing

  // Integer-cent arithmetic only (SRS FR-022) — the seeded totals must match
  // what the API calculates for the same line items.
  let subtotalCents = 0
  const lineItems = seed.items.map((item) => {
    const unitPriceCents = toCents(item.unitPrice)
    const lineTotal = fromCents(
      lineTotalCents(item.quantity, unitPriceCents),
    )
    subtotalCents += lineTotalCents(item.quantity, unitPriceCents)
    return {
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal,
    }
  })
  const tax = seed.tax ?? 0
  const discount = seed.discount ?? 0
  const subtotal = fromCents(subtotalCents)
  const total = fromCents(
    subtotalCents + toCents(tax) - toCents(discount),
  )
  const now = new Date()
  const issued = seed.status === InvoiceStatus.ISSUED

  return prisma.invoice.create({
    data: {
      companyId,
      customerId,
      invoiceNumber: seed.invoiceNumber,
      status: seed.status,
      invoiceDate: now,
      issuedAt: issued ? now : null,
      lockedAt: issued ? now : null,
      subtotal,
      tax,
      discount,
      total,
      currency: "USD",
      notes: seed.notes ?? null,
      invoiceItems: {
        create: lineItems,
      },
    },
  })
}

async function main() {
  console.log("Seeding MiniBiz demo data...\n")

  // ---------------------------------------------------------------- admin
  const admin = await ensureUser({
    name: "Sam Rivera",
    email: "admin@minibiz.test",
  })
  await prisma.platformAdmin.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id },
  })

  // ------------------------------------------------------------ company A
  const acme = await ensureCompany(
    "Acme & Bloom",
    "acme-bloom",
    SubscriptionPlan.PRO,
  )
  const acmeOwner = await ensureUser({
    name: "Alex Morgan",
    email: "owner@acmebloom.test",
  })
  const acmeStaff = await ensureUser({
    name: "Jamie Torres",
    email: "staff@acmebloom.test",
  })
  const acmeViewer = await ensureUser({
    name: "Riley Chen",
    email: "viewer@acmebloom.test",
  })

  await ensureMembership(acmeOwner.id, acme.id, Role.OWNER)
  await ensureMembership(acmeStaff.id, acme.id, Role.STAFF)
  await ensureMembership(acmeViewer.id, acme.id, Role.VIEWER)

  const acmeCustomers = [
    {
      name: "Northstar Coffee",
      email: "ap@northstar.test",
      phone: "+1 415 555 0100",
      address: "218 Mission St, San Francisco, CA",
    },
    {
      name: "Lumen Interiors",
      email: "hello@lumen.test",
      phone: "+1 415 555 0134",
      address: "77 Brannan St, San Francisco, CA",
    },
    {
      name: "Fieldnote Studio",
      email: "studio@fieldnote.test",
      phone: "+1 510 555 0118",
      address: "9 Adeline St, Oakland, CA",
    },
    {
      name: "Harbor Bikes",
      email: "team@harborbikes.test",
      phone: "+1 415 555 0192",
      address: "1500 3rd St, San Francisco, CA",
    },
  ]

  const acmeCustomerRecords = [] as Awaited<ReturnType<typeof ensureCustomer>>[]
  for (const customer of acmeCustomers) {
    acmeCustomerRecords.push(await ensureCustomer(acme.id, customer))
  }

  const acmeInvoices: { customerIndex: number; seed: SeedInvoice }[] = [
    {
      customerIndex: 0,
      seed: {
        invoiceNumber: "INV-2026-0001",
        status: InvoiceStatus.ISSUED,
        items: [
          {
            description: "Brand identity — phase 1",
            quantity: 1,
            unitPrice: 4800,
          },
          { description: "Design sprint (days)", quantity: 3, unitPrice: 950 },
        ],
        tax: 0,
        notes: "Net 30. Thank you for your business.",
      },
    },
    {
      customerIndex: 1,
      seed: {
        invoiceNumber: "INV-2026-0002",
        status: InvoiceStatus.ISSUED,
        items: [
          {
            description: "Website design retainer",
            quantity: 1,
            unitPrice: 3200,
          },
          { description: "Additional hours", quantity: 5, unitPrice: 125.55 },
        ],
        tax: 0,
      },
    },
    {
      customerIndex: 2,
      seed: {
        invoiceNumber: "INV-2026-0003",
        status: InvoiceStatus.DRAFT,
        items: [
          { description: "Packaging concepts", quantity: 2, unitPrice: 1750 },
        ],
      },
    },
    {
      customerIndex: 3,
      seed: {
        invoiceNumber: "INV-2026-0004",
        status: InvoiceStatus.DRAFT,
        items: [
          { description: "Seasonal campaign", quantity: 1, unitPrice: 6400 },
          { description: "Print production", quantity: 1, unitPrice: 1290.5 },
        ],
        discount: 250,
      },
    },
  ]

  for (const { customerIndex, seed } of acmeInvoices) {
    await ensureInvoice(acme.id, acmeCustomerRecords[customerIndex].id, seed)
  }

  // ------------------------------------------------------------ company B
  const lumen = await ensureCompany(
    "Lumen Works",
    "lumen-works",
    SubscriptionPlan.BASIC,
  )
  const lumenOwner = await ensureUser({
    name: "Maya Patel",
    email: "owner@lumenworks.test",
  })
  await ensureMembership(lumenOwner.id, lumen.id, Role.OWNER)

  const lumenCustomer = await ensureCustomer(lumen.id, {
    name: "Brightline Studio",
    email: "hello@brightline.test",
    phone: "+1 503 555 0177",
    address: "412 Alder St, Portland, OR",
  })

  await ensureInvoice(lumen.id, lumenCustomer.id, {
    invoiceNumber: "LW-0001",
    status: InvoiceStatus.ISSUED,
    items: [
      {
        description: "Illustration licence — annual",
        quantity: 1,
        unitPrice: 2400,
      },
    ],
  })

  console.log("Seed complete.\n")
  console.log("  Demo accounts (password: %s)", PASSWORD)
  console.log("    Super Admin  admin@minibiz.test")
  console.log("    Owner        owner@acmebloom.test   (Acme & Bloom — PRO)")
  console.log("    Staff        staff@acmebloom.test   (Acme & Bloom)")
  console.log("    Viewer       viewer@acmebloom.test  (Acme & Bloom)")
  console.log("    Owner        owner@lumenworks.test  (Lumen Works — BASIC)\n")
}

main()
  .catch((error) => {
    console.error("Seed failed:", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
