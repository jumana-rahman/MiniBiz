import { prisma } from "@/lib/prisma"
import { Role } from "@/generated/prisma/enums"

/** A company the user may act on, together with the role they hold there. */
export type Workspace = {
  id: string
  name: string
  slug: string
  plan: string
  role: Role
}

/**
 * The workspaces a user belongs to, most recently joined first.
 *
 * The order is what makes the default correct. Registering always creates a
 * company for the new user (SRS FR-002), so a member who was later invited to
 * another company owns an empty sign-up company *and* belongs to the company
 * that invited them. The newest membership is the one the user actually works
 * in, so it is the one the application opens.
 */
export async function listWorkspaces(userId: string): Promise<Workspace[]> {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: { company: true },
    orderBy: { createdAt: "desc" },
  })
  return memberships.map((membership) => ({
    id: membership.company.id,
    name: membership.company.name,
    slug: membership.company.slug,
    plan: membership.company.subscriptionPlan,
    role: membership.role,
  }))
}

/**
 * Resolves the active workspace of a user.
 *
 * A requested company id is only honoured when the user really is a member of
 * it — the request can never widen access. The role always comes from the
 * membership row, so selecting a workspace can neither change nor elevate a
 * role.
 */
export async function resolveWorkspace(
  userId: string,
  requestedCompanyId?: string | null,
): Promise<{ active: Workspace | null; workspaces: Workspace[] }> {
  const workspaces = await listWorkspaces(userId)
  const requested = requestedCompanyId
    ? workspaces.find((w) => w.id === requestedCompanyId)
    : undefined
  return { active: requested ?? workspaces[0] ?? null, workspaces }
}
