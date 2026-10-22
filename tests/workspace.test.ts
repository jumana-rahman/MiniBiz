import { describe, it, expect, beforeEach, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  membershipFindMany: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    membership: {
      findMany: mocks.membershipFindMany,
    },
  },
}))

import { listWorkspaces, resolveWorkspace } from "@/lib/workspace"
import { Role } from "@/generated/prisma/enums"

function membership(
  companyId: string,
  role: Role,
  createdAt: string,
  name = `Company ${companyId}`,
) {
  return {
    id: `membership_${companyId}`,
    userId: "user_1",
    companyId,
    role,
    createdAt: new Date(createdAt),
    updatedAt: new Date(createdAt),
    company: {
      id: companyId,
      name,
      slug: companyId,
      subscriptionPlan: "TRIAL",
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("listWorkspaces", () => {
  it("only reads the memberships of the given user, newest first", async () => {
    mocks.membershipFindMany.mockResolvedValue([])
    await listWorkspaces("user_1")
    expect(mocks.membershipFindMany).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      include: { company: true },
      orderBy: { createdAt: "desc" },
    })
  })

  it("maps every membership to a workspace carrying the membership role", async () => {
    mocks.membershipFindMany.mockResolvedValue([
      membership("co_invited", Role.VIEWER, "2026-10-21T19:05:52.000Z"),
    ])
    const workspaces = await listWorkspaces("user_1")
    expect(workspaces).toEqual([
      {
        id: "co_invited",
        name: "Company co_invited",
        slug: "co_invited",
        plan: "TRIAL",
        role: Role.VIEWER,
      },
    ])
  })
})

describe("resolveWorkspace", () => {
  it("opens the workspace the user joined most recently", async () => {
    // The registration company is older than the company that invited the
    // user, so the invited company wins the default.
    mocks.membershipFindMany.mockResolvedValue([
      membership("co_invited", Role.VIEWER, "2026-10-21T19:05:52.000Z"),
      membership("co_own", Role.OWNER, "2026-10-21T19:04:36.000Z"),
    ])
    const { active, workspaces } = await resolveWorkspace("user_1")
    expect(workspaces).toHaveLength(2)
    expect(active?.id).toBe("co_invited")
    expect(active?.role).toBe(Role.VIEWER)
  })

  it("honours a requested workspace the user belongs to", async () => {
    mocks.membershipFindMany.mockResolvedValue([
      membership("co_invited", Role.VIEWER, "2026-10-21T19:05:52.000Z"),
      membership("co_own", Role.OWNER, "2026-10-21T19:04:36.000Z"),
    ])
    const { active } = await resolveWorkspace("user_1", "co_own")
    expect(active?.id).toBe("co_own")
    expect(active?.role).toBe(Role.OWNER)
  })

  it("ignores a requested company the user does not belong to", async () => {
    mocks.membershipFindMany.mockResolvedValue([
      membership("co_invited", Role.VIEWER, "2026-10-21T19:05:52.000Z"),
    ])
    const { active } = await resolveWorkspace("user_1", "co_someone_else")
    expect(active?.id).toBe("co_invited")
  })

  it("never reports a role the membership row does not hold", async () => {
    mocks.membershipFindMany.mockResolvedValue([
      membership("co_invited", Role.VIEWER, "2026-10-21T19:05:52.000Z"),
    ])
    const { active } = await resolveWorkspace("user_1", "co_invited")
    expect(active?.role).toBe(Role.VIEWER)
  })

  it("reports no workspace when the user has no membership", async () => {
    mocks.membershipFindMany.mockResolvedValue([])
    const { active, workspaces } = await resolveWorkspace("user_1")
    expect(active).toBeNull()
    expect(workspaces).toEqual([])
  })
})
