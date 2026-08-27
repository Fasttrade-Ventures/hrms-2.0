"use server";

import { redirect } from "next/navigation";
import type { ProductTier } from "@hrms/platform";
import { isSaasMode } from "@hrms/platform";

import {
  countActiveEmployees,
  createCheckoutInvoiceForOrganization,
  getOrganizationSubscription,
} from "@/lib/billing/subscriptions";
import { requireRole } from "@/lib/auth/session";
import { requireOrganizationId } from "@/lib/auth/organization-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateSubscriptionAmount } from "@/lib/billing/calculate-invoice";
import { formatRinggitFromSen } from "@/lib/billing/plans";

export type BillingActionState = {
  error?: string;
};

export async function payNowAction(): Promise<void> {
  if (!isSaasMode()) {
    throw new Error("Billing is only available in SaaS mode.");
  }

  await requireRole("organization_owner");
  const organizationId = await requireOrganizationId();
  const billUrl = await createCheckoutInvoiceForOrganization(organizationId);
  redirect(billUrl);
}

export async function getOwnerBillingSummary(organizationId: string) {
  if (!isSaasMode() || process.env.BILLING_ENABLED !== "true") {
    return null;
  }

  const admin = createAdminClient();
  const subscription = await getOrganizationSubscription(admin, organizationId);
  if (!subscription) return null;

  const activeEmployees = await countActiveEmployees(admin, organizationId);
  const estimate = calculateSubscriptionAmount({
    tier: subscription.billing_plans.tier,
    interval: subscription.billing_interval,
    activeEmployees,
  });

  const { data: invoices } = await admin
    .from("subscription_invoices")
    .select("id, status, total_sen, invoice_type, due_at, paid_at, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(12);

  return {
    subscription,
    activeEmployees,
    nextBillEstimate: formatRinggitFromSen(estimate.totalSen),
    invoices: (invoices ?? []).map((row) => ({
      id: row.id as string,
      status: row.status as string,
      totalLabel: formatRinggitFromSen(row.total_sen as number),
      invoiceType: row.invoice_type as string,
      dueAt: row.due_at as string,
      paidAt: row.paid_at as string | null,
      createdAt: row.created_at as string,
    })),
  };
}

export async function updateSubscriptionPlanAction(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  if (!isSaasMode()) return { error: "Billing unavailable." };

  await requireRole("organization_owner");
  const organizationId = await requireOrganizationId();
  const tier = String(formData.get("planTier") ?? "") as ProductTier;
  const interval = String(formData.get("billingInterval") ?? "month") as "month" | "year";

  if (!["core", "professional", "enterprise"].includes(tier)) {
    return { error: "Invalid plan." };
  }
  if (interval !== "month" && interval !== "year") {
    return { error: "Invalid billing interval." };
  }

  const admin = createAdminClient();
  const plan = await admin.from("billing_plans").select("id").eq("tier", tier).single();
  if (plan.error || !plan.data) return { error: "Plan not found." };

  const { error } = await admin
    .from("organization_billing_subscriptions")
    .update({
      plan_id: plan.data.id,
      billing_interval: interval,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId);

  if (error) return { error: error.message };
  return {};
}
