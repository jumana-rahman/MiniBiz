import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getPlanLimits } from "@/lib/subscription"
import { Role, SubscriptionPlan } from "@/generated/prisma/enums"

const schema = z.object({
  companyId: z.string().min(1),
  plan: z.enum(["TRIAL", "BASIC", "PRO"]),
})

/**
 * Self-service simulated plan change (SRS FR-035).
 * Only the company Owner may change the plan. Downgrading never deletes
 * records (FR-036): existing customers, invoices and seats are preserved and
 * the plan limits enforced on create/update operations immediately block
 * anything that exceeds the new plan.
 */
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }
  const { companyId, plan } = parsed.data

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, companyId },
    include: { company: true },
  })
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (membership.role !== Role.OWNER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const company = await prisma.company.update({
    where: { id: companyId },
    data: { subscriptionPlan: plan as SubscriptionPlan },
  })

  const limits = getPlanLimits(company.subscriptionPlan)
  const [customersUsed, invoicesUsed, seatsUsed] = await Promise.all([
    prisma.customer.count({ where: { companyId } }),
    prisma.invoice.count({ where: { companyId } }),
    prisma.membership.count({
      where: { companyId, role: { in: [Role.STAFF, Role.VIEWER] } },
    }),
  ])

  return NextResponse.json({
    company: {
      id: company.id,
      name: company.name,
      slug: company.slug,
      plan: company.subscriptionPlan,
    },
    usage: {
      customers: { used: customersUsed, limit: limits.customers },
      invoices: { used: invoicesUsed, limit: limits.invoices },
      seats: { used: seatsUsed, limit: limits.seats },
    },
  })
}
