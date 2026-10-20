import { SubscriptionPlan } from "@/../src/generated/prisma/client";

export const PLAN_LIMITS: Record<SubscriptionPlan, { customers: number; invoices: number }> = {
  TRIAL: { customers: 5, invoices: 10 },
  STARTER: { customers: 25, invoices: 100 },
  PRO: { customers: 1000000, invoices: 1000000 },
  ENTERPRISE: { customers: 1000000, invoices: 1000000 },
};

export function getPlanLimits(plan: SubscriptionPlan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.TRIAL;
}
