import type { ProductTier } from "@hrms/platform";

import { BILLING_PLANS, SST_RATE, type BillingInterval } from "./plans";

export type InvoiceType = "subscription" | "overage";

export type CalculateInvoiceInput = {
  tier: ProductTier;
  interval: BillingInterval;
  activeEmployees: number;
  invoiceType?: InvoiceType;
};

export type CalculateInvoiceResult = {
  subtotalSen: number;
  sstSen: number;
  totalSen: number;
  overageCount: number;
  baseSen: number;
  overageSen: number;
};

export function calculateSubscriptionAmount(input: CalculateInvoiceInput): CalculateInvoiceResult {
  const plan = BILLING_PLANS[input.tier];
  const invoiceType = input.invoiceType ?? "subscription";
  const overageCount = Math.max(0, input.activeEmployees - plan.includedHeadcount);
  const overageSen = overageCount * plan.overageAmountSen;

  let baseSen = 0;
  if (invoiceType === "subscription") {
    baseSen =
      input.interval === "year" ? plan.baseAmountSenYearly : plan.baseAmountSenMonthly;
  }

  let billableOverageSen = 0;
  if (invoiceType === "overage") {
    billableOverageSen = overageSen;
  } else if (input.interval === "month") {
    billableOverageSen = overageSen;
  }

  const subtotalSen = baseSen + billableOverageSen;
  const sstSen = Math.round(subtotalSen * SST_RATE);
  const totalSen = subtotalSen + sstSen;

  return {
    subtotalSen,
    sstSen,
    totalSen,
    overageCount,
    baseSen,
    overageSen: billableOverageSen,
  };
}
