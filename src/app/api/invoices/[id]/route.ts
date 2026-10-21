import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { toCents, fromCents, lineTotalCents } from "@/lib/money"
import { serializeInvoice } from "@/lib/serialize"
import { InvoiceStatus } from "@/generated/prisma/enums"
import { invoiceUpdateSchema, firstIssue } from "@/lib/validation"
import { WRITE_ROLES } from "@/lib/permissions"
import { requireTenant } from "@/lib/tenant"
import {
  badRequest,
  conflict,
  errorResponse,
  forbidden,
  notFound,
  readJson,
  serverError,
  unauthorized,
} from "@/lib/http"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      return unauthorized()
    }
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get("companyId")
    const membership = await requireTenant(session.user.id, companyId)

    const invoice = await prisma.invoice.findFirst({
      where: { id, companyId: membership.companyId },
      include: { customer: true, invoiceItems: true },
    })
    if (!invoice) {
      return notFound()
    }
    return NextResponse.json({ invoice: serializeInvoice(invoice) })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      return unauthorized()
    }
    const { id } = await params
    const body = await readJson(req)
    const parsed = invoiceUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest(firstIssue(parsed.error))
    }
    const { companyId, status, notes, invoiceDate, items, tax, discount } =
      parsed.data
    const membership = await requireTenant(
      session.user.id,
      companyId,
      WRITE_ROLES,
    )
    const tenantId = membership.companyId

    try {
      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.invoice.findFirst({
          where: { id, companyId: tenantId },
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
            where: { id, companyId: tenantId, status: InvoiceStatus.DRAFT },
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
        const totalCents =
          subtotalCents + toCents(taxVal) - toCents(discountVal)
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
        if (result.status === 404) return notFound(result.error)
        if (result.status === 409) return conflict(result.error)
        return forbidden(result.error)
      }
      if (!result.invoice) {
        return notFound()
      }
      return NextResponse.json({ invoice: serializeInvoice(result.invoice) })
    } catch (e) {
      console.error("invoice update failed:", e)
      return serverError("Failed to update invoice")
    }
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      return unauthorized()
    }
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get("companyId")
    const membership = await requireTenant(
      session.user.id,
      companyId,
      WRITE_ROLES,
    )
    const tenantId = membership.companyId

    try {
      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.invoice.findFirst({
          where: { id, companyId: tenantId },
        })
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
        if (result.status === 404) return notFound(result.error)
        return forbidden(result.error)
      }
      return NextResponse.json({ ok: true })
    } catch (e) {
      console.error("invoice delete failed:", e)
      return serverError("Failed to delete invoice")
    }
  } catch (e) {
    return errorResponse(e)
  }
}
