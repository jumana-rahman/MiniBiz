import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getPlanLimits } from "@/lib/plans"
import { serializeInvoice } from "@/lib/serialize"
import { InvoiceStatus, Role } from "@/generated/prisma/enums"
import { errorResponse, unauthorized } from "@/lib/http"
import { requireTenantCompany } from "@/lib/tenant"

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      return unauthorized()
    }
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get("companyId")
    const { membership, company } = await requireTenantCompany(
      session.user.id,
      companyId,
    )
    const tenantId = company.id

    const [
      customerCount,
      invoiceCount,
      draftCount,
      issuedCount,
      issuedAggregate,
      seatCount,
    ] = await prisma.$transaction([
      prisma.customer.count({ where: { companyId: tenantId } }),
      prisma.invoice.count({ where: { companyId: tenantId } }),
      prisma.invoice.count({
        where: { companyId: tenantId, status: InvoiceStatus.DRAFT },
      }),
      prisma.invoice.count({
        where: { companyId: tenantId, status: InvoiceStatus.ISSUED },
      }),
      prisma.invoice.aggregate({
        where: { companyId: tenantId, status: InvoiceStatus.ISSUED },
        _sum: { total: true },
      }),
      prisma.membership.count({
        where: {
          companyId: tenantId,
          role: { in: [Role.STAFF, Role.VIEWER] },
        },
      }),
    ])

    const limits = getPlanLimits(company.subscriptionPlan)

    const recentInvoices = await prisma.invoice.findMany({
      where: { companyId: tenantId },
      include: { customer: true, invoiceItems: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    })

    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        plan: company.subscriptionPlan,
      },
      role: membership.role,
      stats: {
        customers: customerCount,
        invoices: invoiceCount,
        drafts: draftCount,
        issued: issuedCount,
        issuedTotal: issuedAggregate._sum.total?.toNumber() ?? 0,
      },
      usage: {
        customers: { used: customerCount, limit: limits.customers },
        invoices: { used: invoiceCount, limit: limits.invoices },
        seats: { used: seatCount, limit: limits.seats },
      },
      recentInvoices: recentInvoices.map(serializeInvoice),
    })
  } catch (e) {
    return errorResponse(e)
  }
}
