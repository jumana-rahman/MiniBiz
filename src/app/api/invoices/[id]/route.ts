import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { toCents, fromCents, lineTotalCents } from "@/lib/money"
import { serializeInvoice } from "@/lib/serialize"
import { Role, InvoiceStatus } from "@/generated/prisma/enums"

const updateSchema = z.object({
  companyId: z.string().min(1),
  status: z.enum(["DRAFT", "ISSUED"]).optional(),
  notes: z.string().max(2000).optional(),
  invoiceDate: z.coerce.date().optional(),
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
    .max(100)
    .optional(),
  tax: z.number().finite().nonnegative().max(1_000_000_000).optional(),
  discount: z.number().finite().nonnegative().max(1_000_000_000).optional(),
})

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
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
  const invoice = await prisma.invoice.findFirst({
    where: { id, companyId },
    include: { customer: true, invoiceItems: true },
  })
  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json({ invoice: serializeInvoice(invoice) })
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    )
  }
  const { companyId, status, notes, invoiceDate, items, tax, discount } =
    parsed.data
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, companyId },
  })
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (membership.role === Role.VIEWER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.invoice.findFirst({
        where: { id, companyId },
        include: { invoiceItems: true },
      })
      if (!existing) {
        return { status: 404 as const, error: "Not found" }
      }
      if (existing.status === InvoiceStatus.ISSUED) {
        return { status: 403 as const, error: "Invoice is locked" }
      }

      if (status === InvoiceStatus.ISSUED) {
        const now = new Date()
        const updated = await tx.invoice.updateMany({
          where: { id, companyId, status: InvoiceStatus.DRAFT },
          data: {
            status: InvoiceStatus.ISSUED,
            issuedAt: now,
            lockedAt: now,
            ...(notes !== undefined ? { notes } : {}),
          },
        })
        if (updated.count === 0) {
          return {
            status: 409 as const,
            error: "Invoice was modified concurrently",
          }
        }
        const invoice = await tx.invoice.findUnique({
          where: { id },
          include: { invoiceItems: true, customer: true },
        })
        return { status: 200 as const, invoice }
      }

      const taxVal = tax !== undefined ? tax : existing.tax.toNumber()
      const discountVal =
        discount !== undefined ? discount : existing.discount.toNumber()

      if (items && items.length > 0) {
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
        const totalCents =
          subtotalCents + toCents(taxVal) - toCents(discountVal)
        await tx.invoiceItem.deleteMany({ where: { invoiceId: id } })
        const invoice = await tx.invoice.update({
          where: { id },
          data: {
            subtotal: fromCents(subtotalCents),
            tax: taxVal,
            discount: discountVal,
            total: fromCents(totalCents),
            notes: notes !== undefined ? notes : existing.notes,
            ...(invoiceDate ? { invoiceDate } : {}),
            invoiceItems: { create: lineItems },
          },
          include: { invoiceItems: true, customer: true },
        })
        return { status: 200 as const, invoice }
      }

      // Tax/discount/notes/date-only edit: recalculate total from the
      // stored subtotal so a tax change can never leave a stale total.
      const subtotalCents = toCents(existing.subtotal.toNumber())
      const totalCents = subtotalCents + toCents(taxVal) - toCents(discountVal)
      const invoice = await tx.invoice.update({
        where: { id },
        data: {
          tax: taxVal,
          discount: discountVal,
          total: fromCents(totalCents),
          notes: notes !== undefined ? notes : existing.notes,
          ...(invoiceDate ? { invoiceDate } : {}),
        },
        include: { invoiceItems: true, customer: true },
      })
      return { status: 200 as const, invoice }
    })

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, {
        status: result.status,
      })
    }
    if (!result.invoice) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    return NextResponse.json({ invoice: serializeInvoice(result.invoice) })
  } catch (e) {
    console.error("invoice update failed:", e)
    return NextResponse.json({ error: "Failed to update invoice" }, {
      status: 500,
    })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
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
  if (membership.role !== Role.OWNER && membership.role !== Role.STAFF) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.invoice.findFirst({ where: { id, companyId } })
      if (!existing) {
        return { status: 404 as const, error: "Not found" }
      }
      if (existing.status === InvoiceStatus.ISSUED) {
        return { status: 403 as const, error: "Invoice is locked" }
      }
      await tx.invoice.delete({ where: { id } })
      return { status: 200 as const, ok: true }
    })
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, {
        status: result.status,
      })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("invoice delete failed:", e)
    return NextResponse.json({ error: "Failed to delete invoice" }, {
      status: 500,
    })
  }
}
