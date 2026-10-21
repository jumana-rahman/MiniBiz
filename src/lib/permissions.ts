import { Role } from "@/generated/prisma/enums"

export type RoleLike = Role | string | null | undefined

/** Roles that may create, edit and delete records inside a company. */
export const WRITE_ROLES: readonly Role[] = [Role.OWNER, Role.STAFF]

/** Roles that may manage team members, roles and the subscription. */
export const OWNER_ROLES: readonly Role[] = [Role.OWNER]

/** Can the role change customers, invoices or other company records? */
export function canWrite(role: RoleLike): boolean {
  return role === Role.OWNER || role === Role.STAFF
}

/** Is the role the company owner (team, roles and subscription area)? */
export function isOwner(role: RoleLike): boolean {
  return role === Role.OWNER
}

/** May the role manage team members and their roles? */
export function canManageTeam(role: RoleLike): boolean {
  return OWNER_ROLES.includes(role as Role)
}
