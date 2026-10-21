import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getPlanLimits } from "@/lib/plans"
import { readPage, totalPages } from "@/lib/pagination"
import { toCents, fromCents, lineTotalCents } from "@/lib/money"
import { serializeInvoice } from "@/lib/serialize"
import { InvoiceStatus } from "@/generated/prisma/enums"
import { invoiceCreateSchema, firstIssue } from "@/lib/validation"
import { WRITE_ROLES } from "@/lib/permissions"
import { findCustomerInCompany, requireTenant } from "@/lib/tenant"
import {
  badRequest,
  conflict,
  errorResponse,
  forbidden,
  readJson,
  serverError,
  unauthorized,
} from "@/lib/http"

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      return unauthorized()
    }
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get("companyId")
    const membership = await requireTenant(session.user.id, companyId)
    const tenantId = membership.companyId

    const customerId = searchParams.get("customerId")
    const rawStatus = searchParams.get("status")
    const status =
      rawStatus === "DRAFT" || rawStatus === "ISSUED"
        ? rawStatus as InvoiceStatus
        : undefined
    const { page, pageSize } = readPage(searchParams)
    const where = {
      companyId: tenantId,
      ...(customerId ? { customerId } : {}),
      ...(status === "DRAFT" || status === "ISSUED" ? { status } : {}),
    }
    const [invoices, total, statusRows] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: { customer: true, invoiceItems: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.invoice.count({ where }),
      prisma.invoice.groupBy({
        by: ["status"],
        where: { companyId: tenantId },
        _count: { _all: true },
      }),
    ])
    const counts = { ALL: total, DRAFT: 0, ISSUED: 0 }
    for (const row of statusRows) {
      if (row.status === "DRAFT") counts.DRAFT = row._count._all
      if (row.status === "ISSUED") counts.ISSUED = row._count._all
    }
    if (status) {
      // The tab badges always show company-wide totals.
      counts.ALL = counts.DRAFT + counts.ISSUED
    }
    return NextResponse.json({
      invoices: invoices.map(serializeInvoice),
      counts,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: totalPages(total, pageSize),
      },
    })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      return unauthorized()
    }
    const body = await readJson(req)
    const parsed = invoiceCreateSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest(firstIssue(parsed.error))
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

    const membership = await requireTenant(
      session.user.id,
      companyId,
      WRITE_ROLES,
    )
    const tenantId = membership.companyId

    // The customer must belong to the same company as the invoice.
    const customer = await findCustomerInCompany(customerId, tenantId)
    if (!customer) {
      return badRequest("Invalid customer")
    }

    const company = await prisma.company.findUnique({ where: { id: tenantId } })
    if (!company) {
      return forbidden()
    }
    const count = await prisma.invoice.count({ where: { companyId: tenantId } })
    const limits = getPlanLimits(company.subscriptionPlan)
    if (count >= limits.invoices) {
      return forbidden("Subscription limit exceeded")
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
          companyId: tenantId,
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
      return NextResponse.json({ invoice: serializeInvoice(invoice) }, {
        status: 201,
      })
    } catch (e: any) {
      if (e.code === "P2002") {
        return conflict("Invoice number already exists")
      }
      console.error("invoice create failed:", e)
      return serverError("Failed to create invoice")
    }
  } catch (e) {
    return errorResponse(e)
  }
}
