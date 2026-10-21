import { prisma } from "@/lib/prisma"
import { Role } from "@/generated/prisma/enums"
import type { Membership } from "@/generated/prisma/client"
import { HttpError } from "@/lib/http"

/**
 * Tenant scoping helpers.
 *
 * The company id is never trusted from the browser: every request re-checks
 * the caller's membership on the server and every query is scoped with the
 * company id that membership resolved to.
 */
/**
 * Resolves the caller's membership in a company or fails with 403.
 * `allowedRoles` restricts the area further (for example the Owner-only
 * team and subscription areas).
 */
export async function requireTenant(
  userId: string,
  companyId: string | null,
  allowedRoles?: readonly Role[],
): Promise<Membership> {
  if (!companyId) {
    throw new HttpError(403, "Forbidden")
  }
  const membership = await prisma.membership.findFirst({
    where: { userId, companyId },
  })
  if (!membership) {
    throw new HttpError(403, "Forbidden")
  }
  if (allowedRoles && !allowedRoles.includes(membership.role)) {
    throw new HttpError(403, "Forbidden")
  }
  return membership
}

/** A customer may only be linked to an invoice inside its own company. */
export async function findCustomerInCompany(
  customerId: string,
  companyId: string,
) {
  return prisma.customer.findFirst({ where: { id: customerId, companyId } })
}

/** The membership together with the company it belongs to. */
export async function requireTenantCompany(
  userId: string,
  companyId: string | null,
  allowedRoles?: readonly Role[],
) {
  const membership = await requireTenant(userId, companyId, allowedRoles)
  const company = await prisma.company.findUnique({
    where: { id: membership.companyId },
  })
  if (!company) {
    throw new HttpError(403, "Forbidden")
  }
  return { membership, company }
}

/** Live usage per company, used for the plan limits. */
export function companyUsage(companyId: string) {
  return {
    customers: prisma.customer.count({ where: { companyId } }),
    invoices: prisma.invoice.count({ where: { companyId } }),
    seats: prisma.membership.count({
      where: { companyId, role: { in: [Role.STAFF, Role.VIEWER] } },
    }),
  }
}
