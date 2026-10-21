import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Role } from "@/generated/prisma/enums"
import { HttpError } from "@/lib/http"
import { requireTenant } from "@/lib/tenant"

export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  return session
}

export async function requireAuth() {
  const session = await getSession()
  if (!session?.user?.id) {
    throw new HttpError(401, "Unauthorized")
  }
  return session
}

export async function getUserCompanies(userId: string) {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: { company: true },
  })
  return memberships
}

/**
 * Resolves the caller's membership in a company. The browser never decides
 * the tenant: every request re-checks membership server-side.
 */
export async function requireCompanyMembership(
  userId: string,
  companyId: string,
  allowedRoles?: Role[],
) {
  return requireTenant(userId, companyId, allowedRoles)
}

export async function isPlatformAdmin(userId: string) {
  const admin = await prisma.platformAdmin.findUnique({
    where: { userId },
  })
  return !!admin
}

/** Platform administrators are stored separately from company memberships. */
export async function requirePlatformAdmin(userId: string) {
  const admin = await prisma.platformAdmin.findUnique({
    where: { userId },
  })
  if (!admin) {
    throw new HttpError(403, "Forbidden")
  }
  return admin
}
