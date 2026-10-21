import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getPlanLimits } from "@/lib/plans"
import { serializeInvoice } from "@/lib/serialize"
import { InvoiceStatus, Role } from "@/generated/prisma/enums"

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
    include: { company: true },
  })
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const company = membership.company
  const [
    customerCount,
    invoiceCount,
    draftCount,
    issuedCount,
    issuedAggregate,
    seatCount,
  ] = await prisma.$transaction([
    prisma.customer.count({ where: { companyId } }),
    prisma.invoice.count({ where: { companyId } }),
    prisma.invoice.count({ where: { companyId, status: InvoiceStatus.DRAFT } }),
    prisma.invoice.count({
      where: { companyId, status: InvoiceStatus.ISSUED },
    }),
    prisma.invoice.aggregate({
      where: { companyId, status: InvoiceStatus.ISSUED },
      _sum: { total: true },
    }),
    prisma.membership.count({
      where: {
        companyId,
        role: { in: [Role.STAFF, Role.VIEWER] },
      },
    }),
  ])

  const limits = getPlanLimits(company.subscriptionPlan)

  const recentInvoices = await prisma.invoice.findMany({
    where: { companyId },
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
}
