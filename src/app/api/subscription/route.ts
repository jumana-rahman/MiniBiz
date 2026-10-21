import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getPlanLimits } from "@/lib/plans"
import { SubscriptionPlan } from "@/generated/prisma/enums"
import { planChangeSchema } from "@/lib/validation"
import { requireTenant, companyUsage } from "@/lib/tenant"
import { OWNER_ROLES } from "@/lib/permissions"
import { badRequest, errorResponse, readJson, unauthorized } from "@/lib/http"

/**
 * Self-service simulated plan change (SRS FR-035).
 * Only the company Owner may change the plan. Downgrading never deletes
 * records (FR-036): existing customers, invoices and seats are preserved and
 * the plan limits enforced on create/update operations immediately block
 * anything that exceeds the new plan.
 */
export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      return unauthorized()
    }
    const body = await readJson(req)
    const parsed = planChangeSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest()
    }
    const { companyId, plan } = parsed.data

    const membership = await requireTenant(session.user.id, companyId, OWNER_ROLES)
    const tenantId = membership.companyId

    const company = await prisma.company.update({
      where: { id: tenantId },
      data: { subscriptionPlan: plan as SubscriptionPlan },
    })

    const limits = getPlanLimits(company.subscriptionPlan)
    const usage = companyUsage(tenantId)
    const [customersUsed, invoicesUsed, seatsUsed] = await Promise.all([
      usage.customers,
      usage.invoices,
      usage.seats,
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
  } catch (e) {
    return errorResponse(e)
  }
}
