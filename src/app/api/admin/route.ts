import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { getPlanLimits, PLAN_LIMITS } from "@/lib/subscription"
import { SubscriptionPlan } from "@/generated/prisma/enums"

const schema = z.object({
  companyId: z.string().min(1),
  plan: z.enum(["TRIAL", "BASIC", "PRO"]),
})

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const admin = await prisma.platformAdmin.findUnique({
    where: { userId: session.user.id },
  })
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const companies = await prisma.company.findMany({
    include: {
      memberships: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const rows = companies.map((c) => {
    const limits = getPlanLimits(c.subscriptionPlan)
    const owner = c.memberships.find((m) => m.role === "OWNER")
    const customersUsed = c.customersCount
    const invoicesUsed = c.invoicesCount
    const atLimit =
      customersUsed >= limits.customers || invoicesUsed >= limits.invoices
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      plan: c.subscriptionPlan,
      createdAt: c.createdAt,
      ownerName: owner?.user.name ?? owner?.user.email ?? "—",
      ownerEmail: owner?.user.email ?? "—",
      memberCount: c.memberships.length,
      customersUsed,
      customersLimit: limits.customers,
      invoicesUsed,
      invoicesLimit: limits.invoices,
      atLimit,
      status: atLimit
        ? "LIMIT_REACHED"
        : c.subscriptionPlan === "TRIAL"
          ? "TRIAL"
          : "ACTIVE",
    }
  })

  const stats = {
    totalCompanies: rows.length,
    trialCompanies: rows.filter((r) => r.plan === "TRIAL").length,
    payingCompanies: rows.filter((r) => r.plan !== "TRIAL").length,
    limitWarnings: rows.filter((r) => r.atLimit).length,
    totalCustomers: rows.reduce((sum, r) => sum + r.customersUsed, 0),
    totalInvoices: rows.reduce((sum, r) => sum + r.invoicesUsed, 0),
  }

  return NextResponse.json({ companies: rows, stats, planLimits: PLAN_LIMITS })
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const admin = await prisma.platformAdmin.findUnique({
    where: { userId: session.user.id },
  })
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }
  const { companyId, plan } = parsed.data
  const existing = await prisma.company.findUnique({ where: { id: companyId } })
  if (!existing) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 })
  }
  const company = await prisma.company.update({
    where: { id: companyId },
    data: { subscriptionPlan: plan as SubscriptionPlan },
  })
  return NextResponse.json({
    company: { ...company, subscriptionPlan: company.subscriptionPlan },
  })
}
