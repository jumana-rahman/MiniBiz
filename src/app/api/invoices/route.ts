import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { getPlanLimits } from "@/lib/subscription"
import { toCents, fromCents, lineTotalCents } from "@/lib/money"
import { serializeInvoice } from "@/lib/serialize"
import { Role, InvoiceStatus } from "@/generated/prisma/enums"

const schema = z.object({
  companyId: z.string().min(1),
  customerId: z.string().min(1),
  invoiceNumber: z
    .string()
    .trim()
    .min(1, "Invoice number is required")
    .max(50, "Invoice number must be 50 characters or fewer")
    .regex(
      /^[A-Za-z0-9][A-Za-z0-9\-_/#. ]*$/,
      "Invoice number contains invalid characters",
    ),
  invoiceDate: z.coerce.date().optional(),
  currency: z.string().max(10).optional(),
  notes: z.string().max(2000).optional(),
  items: z
    .array(
      z.object({
        description: z.string().min(1, "Item description is required").max(500),
        quantity: z
          .number()
          .finite()
          .positive("Quantity must be positive")
          .max(1_000_000),
        unitPrice: z
          .number()
          .finite()
          .nonnegative("Unit price cannot be negative")
          .max(1_000_000_000),
      }),
    )
    .min(1, "At least one line item is required")
    .max(100),
  tax: z.number().finite().nonnegative().max(1_000_000_000).optional(),
  discount: z.number().finite().nonnegative().max(1_000_000_000).optional(),
})

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get("companyId")
  if (!companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, companyId },
  })
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const customerId = searchParams.get("customerId")
  const invoices = await prisma.invoice.findMany({
    where: { companyId, ...(customerId ? { customerId } : {}) },
    include: { customer: true, invoiceItems: true },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ invoices: invoices.map(serializeInvoice) })
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    )
  }
  const {
    companyId,
    customerId,
    invoiceNumber,
    invoiceDate,
    currency,
    notes,
    items,
    tax,
    discount,
  } = parsed.data
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, companyId },
  })
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (membership.role === Role.VIEWER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, companyId },
  })
  if (!customer) {
    return NextResponse.json({ error: "Invalid customer" }, { status: 400 })
  }

  const company = await prisma.company.findUnique({ where: { id: companyId } })
  if (!company) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const count = await prisma.invoice.count({ where: { companyId } })
  const limits = getPlanLimits(company.subscriptionPlan)
  if (count >= limits.invoices) {
    return NextResponse.json({ error: "Subscription limit exceeded" }, {
      status: 403,
    })
  }

  let subtotalCents = 0
  const lineItems = items.map((item) => {
    const cents = lineTotalCents(item.quantity, toCents(item.unitPrice))
    subtotalCents += cents
    return {
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: fromCents(cents),
    }
  })

  const taxVal = tax || 0
  const discountVal = discount || 0
  const totalCents = subtotalCents + toCents(taxVal) - toCents(discountVal)

  try {
    const invoice = await prisma.invoice.create({
      data: {
        companyId,
        customerId,
        invoiceNumber,
        ...(invoiceDate ? { invoiceDate } : {}),
        status: InvoiceStatus.DRAFT,
        subtotal: fromCents(subtotalCents),
        tax: taxVal,
        discount: discountVal,
        total: fromCents(totalCents),
        currency: currency || "USD",
        notes: notes || null,
        invoiceItems: {
          create: lineItems,
        },
      },
      include: { invoiceItems: true, customer: true },
    })
    await prisma.company.update({
      where: { id: companyId },
      data: { invoicesCount: { increment: 1 } },
    })
    return NextResponse.json({ invoice: serializeInvoice(invoice) }, {
      status: 201,
    })
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Invoice number already exists" }, {
        status: 409,
      })
    }
    console.error("invoice create failed:", e)
    return NextResponse.json({ error: "Failed to create invoice" }, {
      status: 500,
    })
  }
}
