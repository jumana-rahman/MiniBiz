import { describe, it, expect } from "vitest"
import {
  PLAN_LIMITS,
  PLAN_CATALOG,
  PLAN_ORDER,
  UNLIMITED,
  getPlanLimits,
  formatLimit,
  planLabel,
} from "@/lib/plans"

describe("plan limits (SRS §5)", () => {
  it("defines the three plans in upgrade order", () => {
    expect(PLAN_ORDER).toEqual(["TRIAL", "BASIC", "PRO"])
    expect(PLAN_CATALOG.map((p) => p.key)).toEqual(PLAN_ORDER)
  })

  it("applies the documented trial limits", () => {
    expect(PLAN_LIMITS.TRIAL).toEqual({
      customers: 5,
      invoices: 10,
      seats: 2,
    })
  })

  it("applies the documented basic limits", () => {
    expect(PLAN_LIMITS.BASIC).toEqual({
      customers: 25,
      invoices: 100,
      seats: 10,
    })
  })

  it("makes pro unlimited on every axis", () => {
    expect(PLAN_LIMITS.PRO.customers).toBe(UNLIMITED)
    expect(PLAN_LIMITS.PRO.invoices).toBe(UNLIMITED)
    expect(PLAN_LIMITS.PRO.seats).toBe(UNLIMITED)
  })

  it("never lets a higher plan have lower limits than a lower one", () => {
    for (let i = 1; i < PLAN_ORDER.length; i++) {
      const lower = PLAN_LIMITS[PLAN_ORDER[i - 1]]
      const higher = PLAN_LIMITS[PLAN_ORDER[i]]
      expect(higher.customers).toBeGreaterThanOrEqual(lower.customers)
      expect(higher.invoices).toBeGreaterThanOrEqual(lower.invoices)
      expect(higher.seats).toBeGreaterThanOrEqual(lower.seats)
    }
  })

  it("falls back to trial limits for unknown or missing plans", () => {
    expect(getPlanLimits(null)).toEqual(PLAN_LIMITS.TRIAL)
    expect(getPlanLimits(undefined)).toEqual(PLAN_LIMITS.TRIAL)
    expect(getPlanLimits("GOLD")).toEqual(PLAN_LIMITS.TRIAL)
  })

  it("returns the matching limits for a known plan", () => {
    expect(getPlanLimits("PRO")).toEqual(PLAN_LIMITS.PRO)
    expect(getPlanLimits("BASIC")).toEqual(PLAN_LIMITS.BASIC)
  })

  it("formats unlimited limits as a label rather than a number", () => {
    expect(formatLimit(UNLIMITED)).toBe("Unlimited")
    expect(formatLimit(5)).toBe("5")
  })

  it("resolves human readable plan labels", () => {
    expect(planLabel("PRO")).toBe("Pro")
    expect(planLabel("TRIAL")).toBe("Trial")
    expect(planLabel(null)).toBe("Trial")
  })
})
