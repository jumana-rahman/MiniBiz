import { SubscriptionPlan } from "@/../src/generated/prisma/client";

export interface PlanLimits {
  customers: number;
  invoices: number;
  seats: number;
}

/**
 * Central plan configuration (SRS §5).
 * Trial: 5 customers / 10 invoices / 2 non-owner seats.
 * Basic: 25 customers / 100 invoices / 10 non-owner seats.
 * Pro: unlimited on all three (represented by Number.MAX_SAFE_INTEGER).
 */
export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  TRIAL: { customers: 5, invoices: 10, seats: 2 },
  BASIC: { customers: 25, invoices: 100, seats: 10 },
  PRO: {
    customers: Number.MAX_SAFE_INTEGER,
    invoices: Number.MAX_SAFE_INTEGER,
    seats: Number.MAX_SAFE_INTEGER,
  },
};

export const PLAN_ORDER: SubscriptionPlan[] = [
  "TRIAL",
  "BASIC",
  "PRO",
];

export function getPlanLimits(plan: SubscriptionPlan): PlanLimits {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.TRIAL;
}

export function formatLimit(n: number): string {
  return n >= Number.MAX_SAFE_INTEGER ? "Unlimited" : String(n);
}
