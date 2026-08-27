import type { ProductTier } from "@hrms/platform";

export type BillingInterval = "month" | "year";

export type BillingPlanDefinition = {
  tier: ProductTier;
  name: string;
  baseAmountSenMonthly: number;
  baseAmountSenYearly: number;
  overageAmountSen: number;
  includedHeadcount: number;
  trialDays: number;
};

/** Mirrors `billing_plans` seed data (sen, before SST). */
export const BILLING_PLANS: Record<ProductTier, BillingPlanDefinition> = {
  core: {
    tier: "core",
    name: "Core",
    baseAmountSenMonthly: 6900,
    baseAmountSenYearly: 69000,
    overageAmountSen: 600,
    includedHeadcount: 10,
    trialDays: 14,
  },
  professional: {
    tier: "professional",
    name: "Professional",
    baseAmountSenMonthly: 12900,
    baseAmountSenYearly: 129000,
    overageAmountSen: 1200,
    includedHeadcount: 10,
    trialDays: 14,
  },
  enterprise: {
    tier: "enterprise",
    name: "Enterprise",
    baseAmountSenMonthly: 17900,
    baseAmountSenYearly: 179000,
    overageAmountSen: 1700,
    includedHeadcount: 10,
    trialDays: 14,
  },
};

export const BILLING_PLAN_OPTIONS = Object.values(BILLING_PLANS);

export const SST_RATE = 0.08;

export function getBillplzCollectionEnvKey(tier: ProductTier): string {
  return `BILLPLZ_COLLECTION_${tier.toUpperCase()}`;
}

export function resolveBillplzCollectionId(
  tier: ProductTier,
  planCollectionId: string | null | undefined,
): string | null {
  if (planCollectionId?.trim()) return planCollectionId.trim();
  const fromEnv = process.env[getBillplzCollectionEnvKey(tier)];
  return fromEnv?.trim() || null;
}

export function formatRinggitFromSen(sen: number): string {
  return `RM ${(sen / 100).toFixed(2)}`;
}
