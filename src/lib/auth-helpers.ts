import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Role } from "@/generated/prisma/enums"

export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  return session
}

export async function requireAuth() {
  const session = await getSession()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
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

export async function requireCompanyMembership(
  userId: string,
  companyId: string,
  allowedRoles?: Role[],
) {
  const membership = await prisma.membership.findFirst({
    where: { userId, companyId },
    include: { company: true },
  })
  if (!membership) {
    throw new Error("Forbidden")
  }
  if (
    allowedRoles &&
    allowedRoles.length > 0 &&
    !allowedRoles.includes(membership.role)
  ) {
    throw new Error("Forbidden")
  }
  return membership
}

export async function isPlatformAdmin(userId: string) {
  const admin = await prisma.platformAdmin.findUnique({
    where: { userId },
  })
  return !!admin
}
