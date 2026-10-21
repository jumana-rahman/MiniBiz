import { describe, it, expect, beforeEach, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  membershipFindFirst: vi.fn(),
  membershipFindMany: vi.fn(),
  platformAdminFindUnique: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mocks.getSession } },
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    membership: {
      findFirst: mocks.membershipFindFirst,
      findMany: mocks.membershipFindMany,
    },
    platformAdmin: {
      findUnique: mocks.platformAdminFindUnique,
    },
  },
}))

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
}))

import {
  getSession,
  requireAuth,
  getUserCompanies,
  requireCompanyMembership,
  isPlatformAdmin,
} from "@/lib/auth-helpers"
import { Role } from "@/generated/prisma/enums"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("getSession / requireAuth", () => {
  it("returns null when there is no session", async () => {
    mocks.getSession.mockResolvedValue(null)
    expect(await getSession()).toBeNull()
  })

  it("throws Unauthorized when there is no session", async () => {
    mocks.getSession.mockResolvedValue(null)
    await expect(requireAuth()).rejects.toThrow("Unauthorized")
  })

  it("throws Unauthorized when the session has no user", async () => {
    mocks.getSession.mockResolvedValue({ user: {} })
    await expect(requireAuth()).rejects.toThrow("Unauthorized")
  })

  it("returns the session when a user is present", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "user_1" } })
    await expect(requireAuth()).resolves.toEqual({ user: { id: "user_1" } })
  })
})

describe("getUserCompanies", () => {
  it("only queries memberships for the given user", async () => {
    mocks.membershipFindMany.mockResolvedValue([])
    await getUserCompanies("user_1")
    expect(mocks.membershipFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user_1" } }),
    )
  })
})

describe("requireCompanyMembership", () => {
  it("throws Forbidden when the user has no membership in the company", async () => {
    mocks.membershipFindFirst.mockResolvedValue(null)
    await expect(
      requireCompanyMembership("user_1", "co_other"),
    ).rejects.toThrow("Forbidden")
  })

  it("returns the membership when the user belongs to the company", async () => {
    mocks.membershipFindFirst.mockResolvedValue({
      role: Role.OWNER,
      company: { id: "co_1" },
    })
    const membership = await requireCompanyMembership("user_1", "co_1")
    expect(membership.role).toBe(Role.OWNER)
  })

  it("throws Forbidden when the role is not in the allowed list", async () => {
    mocks.membershipFindFirst.mockResolvedValue({
      role: Role.VIEWER,
      company: { id: "co_1" },
    })
    await expect(
      requireCompanyMembership("user_1", "co_1", [Role.OWNER, Role.STAFF]),
    ).rejects.toThrow("Forbidden")
  })

  it("allows a role that is in the allowed list", async () => {
    mocks.membershipFindFirst.mockResolvedValue({
      role: Role.STAFF,
      company: { id: "co_1" },
    })
    const membership = await requireCompanyMembership("user_1", "co_1", [
      Role.OWNER,
      Role.STAFF,
    ])
    expect(membership.role).toBe(Role.STAFF)
  })

  it("scopes the lookup to both the user and the company", async () => {
    mocks.membershipFindFirst.mockResolvedValue({ role: Role.OWNER })
    await requireCompanyMembership("user_1", "co_1")
    expect(mocks.membershipFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user_1", companyId: "co_1" },
      }),
    )
  })
})

describe("isPlatformAdmin", () => {
  it("is true when a platform admin record exists", async () => {
    mocks.platformAdminFindUnique.mockResolvedValue({ userId: "user_1" })
    expect(await isPlatformAdmin("user_1")).toBe(true)
  })

  it("is false when no platform admin record exists", async () => {
    mocks.platformAdminFindUnique.mockResolvedValue(null)
    expect(await isPlatformAdmin("user_1")).toBe(false)
  })
})
