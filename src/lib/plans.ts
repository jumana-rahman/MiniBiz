export type PlanKey = "TRIAL" | "BASIC" | "PRO"

export interface PlanLimits {
  customers: number
  invoices: number
  seats: number
}

export const UNLIMITED = Number.MAX_SAFE_INTEGER

/**
 * Central plan configuration (SRS §5). This module is intentionally free of
 * any server-only imports so it can be used from client components.
 *
 * Trial: 5 customers / 10 invoices / 2 non-owner seats.
 * Basic: 25 customers / 100 invoices / 10 non-owner seats.
 * Pro: unlimited on all three.
 */
export const PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
  TRIAL: { customers: 5, invoices: 10, seats: 2 },
  BASIC: { customers: 25, invoices: 100, seats: 10 },
  PRO: { customers: UNLIMITED, invoices: UNLIMITED, seats: UNLIMITED },
}

export const PLAN_ORDER: PlanKey[] = ["TRIAL", "BASIC", "PRO"]

export const PLAN_CATALOG: {
  key: PlanKey
  name: string
  price: string
  description: string
  features: string[]
}[] = [
  {
    key: "TRIAL",
    name: "Trial",
    price: "$0",
    description: "Explore the essentials for 14 days.",
    features: ["5 customers", "10 invoices total", "2 team seats"],
  },
  {
    key: "BASIC",
    name: "Basic",
    price: "$19",
    description: "For freelancers and small businesses.",
    features: ["25 customers", "100 invoices total", "10 team seats"],
  },
  {
    key: "PRO",
    name: "Pro",
    price: "$49",
    description: "For established, growing teams.",
    features: [
      "Unlimited customers",
      "Unlimited invoices",
      "Unlimited team seats",
    ],
  },
]

export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  if (plan && plan in PLAN_LIMITS) {
    return PLAN_LIMITS[(plan as PlanKey)]
  }
  return PLAN_LIMITS.TRIAL
}

export function formatLimit(n: number): string {
  return n >= UNLIMITED ? "Unlimited" : String(n)
}

export function planLabel(plan: string | null | undefined): string {
  const found = PLAN_CATALOG.find((p) => p.key === plan)
  return found?.name ?? "Trial"
}
