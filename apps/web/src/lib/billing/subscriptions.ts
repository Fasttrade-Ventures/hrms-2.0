import type { ProductTier } from "@hrms/platform";
import { isSaasMode } from "@hrms/platform";
import type { SupabaseClient } from "@supabase/supabase-js";

import { calculateSubscriptionAmount, type InvoiceType } from "@/lib/billing/calculate-invoice";
import { type BillingInterval } from "@/lib/billing/plans";
import { createStripeCheckoutSession } from "@/lib/billing/stripe";
import { syncEntitlementsFromSubscription } from "@/lib/billing/sync-entitlements";
import { createAdminClient } from "@/lib/supabase/admin";
import { relationOne } from "@/lib/supabase/relation-one";

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "paused";

export type BillingPlanRow = {
  id: string;
  tier: ProductTier;
  name: string;
  base_amount_sen_monthly: number;
  base_amount_sen_yearly: number;
  overage_amount_sen: number;
  included_headcount: number;
  billplz_collection_id: string | null;
  trial_days: number;
};

export type OrganizationSubscriptionRow = {
  id: string;
  organization_id: string;
  plan_id: string;
  billing_interval: BillingInterval;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  trial_ends_at: string | null;
  cancel_at_period_end: boolean;
  billplz_email: string;
  billing_plans: BillingPlanRow;
};

function billingEnabled(): boolean {
  return isSaasMode() && process.env.BILLING_ENABLED === "true";
}

function trialDays(plan: BillingPlanRow): number {
  const fromEnv = Number(process.env.BILLING_TRIAL_DAYS);
  if (Number.isFinite(fromEnv) && fromEnv >= 0) return fromEnv;
  return plan.trial_days;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

function addYears(date: Date, years: number): Date {
  const next = new Date(date);
  next.setUTCFullYear(next.getUTCFullYear() + years);
  return next;
}

function periodEndFrom(start: Date, interval: BillingInterval): Date {
  return interval === "year" ? addYears(start, 1) : addMonths(start, 1);
}

export async function getBillingPlanByTier(
  admin: SupabaseClient,
  tier: ProductTier,
): Promise<BillingPlanRow> {
  const { data, error } = await admin
    .from("billing_plans")
    .select(
      "id, tier, name, base_amount_sen_monthly, base_amount_sen_yearly, overage_amount_sen, included_headcount, billplz_collection_id, trial_days",
    )
    .eq("tier", tier)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? `Billing plan not found for tier ${tier}.`);
  }

  return data as BillingPlanRow;
}

export async function countActiveEmployees(
  admin: SupabaseClient,
  organizationId: string,
): Promise<number> {
  const { count, error } = await admin
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "active");

  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function appendBillingEvent(
  admin: SupabaseClient,
  organizationId: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await admin.from("billing_events").insert({
    organization_id: organizationId,
    event_type: eventType,
    payload,
  });
}

export async function createSubscriptionOnRegister(input: {
  organizationId: string;
  ownerEmail: string;
  planTier: ProductTier;
  billingInterval: BillingInterval;
}): Promise<void> {
  if (!billingEnabled()) return;

  const admin = createAdminClient();
  const plan = await getBillingPlanByTier(admin, input.planTier);
  const now = new Date();
  const trialEndsAt = addDays(now, trialDays(plan));
  const periodEnd = trialEndsAt;

  const { error } = await admin.from("organization_billing_subscriptions").insert({
    organization_id: input.organizationId,
    plan_id: plan.id,
    billing_interval: input.billingInterval,
    status: "trialing",
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
    trial_ends_at: trialEndsAt.toISOString(),
    billplz_email: input.ownerEmail,
  });

  if (error) throw new Error(error.message);

  await syncEntitlementsFromSubscription(admin, input.organizationId);
  await appendBillingEvent(admin, input.organizationId, "subscription.created", {
    planTier: input.planTier,
    billingInterval: input.billingInterval,
    trialEndsAt: trialEndsAt.toISOString(),
  });
}

export async function getOrganizationSubscription(
  admin: SupabaseClient,
  organizationId: string,
): Promise<OrganizationSubscriptionRow | null> {
  const { data, error } = await admin
    .from("organization_billing_subscriptions")
    .select(
      "id, organization_id, plan_id, billing_interval, status, current_period_start, current_period_end, trial_ends_at, cancel_at_period_end, billplz_email, billing_plans(id, tier, name, base_amount_sen_monthly, base_amount_sen_yearly, overage_amount_sen, included_headcount, billplz_collection_id, trial_days)",
    )
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as OrganizationSubscriptionRow | null) ?? null;
}

function unwrapPlan(value: unknown): BillingPlanRow {
  const plan = relationOne(value as BillingPlanRow | BillingPlanRow[] | null);
  if (!plan) throw new Error("Billing plan relation missing.");
  return plan;
}

export async function createSubscriptionInvoice(input: {
  organizationId: string;
  subscriptionId: string;
  plan: BillingPlanRow;
  billingInterval: BillingInterval;
  invoiceType?: InvoiceType;
  activeEmployees: number;
  periodStart: Date;
  periodEnd: Date;
  dueAt: Date;
}): Promise<string> {
  const admin = createAdminClient();
  const invoiceType = input.invoiceType ?? "subscription";
  const amounts = calculateSubscriptionAmount({
    tier: input.plan.tier,
    interval: input.billingInterval,
    activeEmployees: input.activeEmployees,
    invoiceType,
  });

  const { data, error } = await admin
    .from("subscription_invoices")
    .insert({
      organization_id: input.organizationId,
      subscription_id: input.subscriptionId,
      plan_id: input.plan.id,
      invoice_type: invoiceType,
      amount_sen: amounts.subtotalSen,
      sst_sen: amounts.sstSen,
      total_sen: amounts.totalSen,
      active_employee_count: input.activeEmployees,
      period_start: input.periodStart.toISOString(),
      period_end: input.periodEnd.toISOString(),
      status: "open",
      due_at: input.dueAt.toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create invoice.");
  return data.id as string;
}

export async function createBillForInvoice(invoiceId: string): Promise<string> {
  if (!billingEnabled()) {
    throw new Error("Billing is not enabled.");
  }

  const admin = createAdminClient();
  const { data: invoice, error } = await admin
    .from("subscription_invoices")
    .select(
      "id, organization_id, total_sen, status, invoice_type, subscription_id, billing_plans(tier, name), organization_billing_subscriptions(billplz_email, billing_interval)",
    )
    .eq("id", invoiceId)
    .single();

  if (error || !invoice) throw new Error(error?.message ?? "Invoice not found.");
  if (invoice.status === "paid") {
    throw new Error("Invoice is already paid.");
  }

  const plan = unwrapPlan(invoice.billing_plans);
  const subscription = relationOne(
    invoice.organization_billing_subscriptions as
      | { billplz_email: string; billing_interval: BillingInterval }
      | Array<{ billplz_email: string; billing_interval: BillingInterval }>
      | null,
  );
  if (!subscription?.billplz_email) throw new Error("Subscription billing email is missing.");

  const session = await createStripeCheckoutSession({
    invoiceId,
    amountSen: invoice.total_sen as number,
    planName: plan.name,
    customerEmail: subscription.billplz_email,
  });

  const { error: sessionError } = await admin.from("stripe_checkout_sessions").insert({
    organization_id: invoice.organization_id,
    invoice_id: invoiceId,
    stripe_session_id: session.id,
    checkout_url: session.url,
  });

  if (sessionError) throw new Error(sessionError.message);

  await appendBillingEvent(admin, invoice.organization_id as string, "stripe.checkout.created", {
    invoiceId,
    stripeSessionId: session.id,
  });

  return session.url;
}

export async function markInvoicePaidFromStripe(input: {
  invoiceId: string;
  stripeSessionId: string;
  amountTotal: number | null;
}): Promise<boolean> {
  const admin = createAdminClient();
  const { data: sessionRow } = await admin
    .from("stripe_checkout_sessions")
    .select("invoice_id")
    .eq("stripe_session_id", input.stripeSessionId)
    .maybeSingle();

  if (!sessionRow || sessionRow.invoice_id !== input.invoiceId) {
    return false;
  }

  const { data: invoice } = await admin
    .from("subscription_invoices")
    .select("total_sen, status")
    .eq("id", input.invoiceId)
    .maybeSingle();

  if (!invoice) return false;
  if (invoice.status !== "paid") {
    if (input.amountTotal == null || input.amountTotal !== invoice.total_sen) {
      return false;
    }
  }

  return markInvoicePaid(input.invoiceId, { stripeSessionId: input.stripeSessionId });
}

export async function reuseMatchingOpenInvoice(input: {
  organizationId: string;
  subscriptionId: string;
  expectedTotalSen: number;
}): Promise<string | null> {
  const admin = createAdminClient();
  const { data: openInvoices, error } = await admin
    .from("subscription_invoices")
    .select("id, total_sen")
    .eq("organization_id", input.organizationId)
    .eq("subscription_id", input.subscriptionId)
    .eq("status", "open");

  if (error) throw new Error(error.message);

  let reusable: string | null = null;
  for (const row of openInvoices ?? []) {
    if (row.total_sen === input.expectedTotalSen && !reusable) {
      reusable = row.id as string;
      continue;
    }
    await admin.from("subscription_invoices").update({ status: "void" }).eq("id", row.id as string);
  }

  return reusable;
}

export async function markInvoicePaid(
  invoiceId: string,
  provider: { stripeSessionId?: string; billplzBillId?: string },
): Promise<boolean> {
  const admin = createAdminClient();
  const { data: invoice } = await admin
    .from("subscription_invoices")
    .select("id, organization_id, subscription_id, status")
    .eq("id", invoiceId)
    .maybeSingle();

  if (!invoice) return false;

  const { data: subscription } = await admin
    .from("organization_billing_subscriptions")
    .select("id, status, billing_interval")
    .eq("id", invoice.subscription_id)
    .single();

  const alreadyPaid = invoice.status === "paid";
  const alreadyActive = subscription?.status === "active";
  if (alreadyPaid && alreadyActive) {
    await syncEntitlementsFromSubscription(admin, invoice.organization_id as string);
    return true;
  }

  if (!alreadyPaid) {
    const paidAt = new Date().toISOString();
    if (provider.stripeSessionId) {
      await admin
        .from("stripe_checkout_sessions")
        .update({ status: "paid" })
        .eq("stripe_session_id", provider.stripeSessionId);
    }
    await admin
      .from("subscription_invoices")
      .update({ status: "paid", paid_at: paidAt })
      .eq("id", invoice.id);
  }

  if (!alreadyActive) {
    const now = new Date();
    const billingInterval = (subscription?.billing_interval ?? "month") as BillingInterval;
    const periodEnd = periodEndFrom(now, billingInterval);
    const { error: activationError } = await admin
      .from("organization_billing_subscriptions")
      .update({
        status: "active",
        trial_ends_at: null,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", invoice.subscription_id);
    if (activationError) throw new Error(activationError.message);
  }

  await syncEntitlementsFromSubscription(admin, invoice.organization_id as string);
  if (!alreadyPaid) {
    await appendBillingEvent(admin, invoice.organization_id as string, "invoice.paid", {
      invoiceId: invoice.id,
      ...provider,
    });
  }

  return true;
}

export async function markInvoicePaidFromCallback(payload: Record<string, string>): Promise<boolean> {
  const admin = createAdminClient();
  const billplzBillId = payload.id;
  if (!billplzBillId) return false;

  const paid = payload.paid === "true";
  if (!paid) return false;

  const { data: billRow } = await admin
    .from("billplz_bills")
    .select("id, invoice_id, state")
    .eq("billplz_bill_id", billplzBillId)
    .maybeSingle();

  const invoiceId = payload.reference_1 ?? billRow?.invoice_id;
  if (!invoiceId) return false;

  const paidAt = payload.paid_at ? new Date(payload.paid_at).toISOString() : new Date().toISOString();
  await admin
    .from("billplz_bills")
    .update({
      state: "paid",
      paid_at: paidAt,
      callback_payload: payload,
    })
    .eq("billplz_bill_id", billplzBillId);

  return markInvoicePaid(invoiceId, { billplzBillId });
}

export function isBillingRequired(): boolean {
  return billingEnabled();
}

/** @deprecated Prefer importing from `@/lib/billing/subscription-gate` — kept for callers. */
export { requireActiveSubscription } from "@/lib/billing/subscription-gate";

export async function createCheckoutInvoiceForOrganization(organizationId: string): Promise<string> {
  const admin = createAdminClient();
  const subscription = await getOrganizationSubscription(admin, organizationId);
  if (!subscription) {
    throw new Error("No subscription found for this organization.");
  }

  const activeEmployees = await countActiveEmployees(admin, organizationId);
  const now = new Date();
  const periodEnd = periodEndFrom(now, subscription.billing_interval);
  const dueAt = addDays(now, 7);
  const expected = calculateSubscriptionAmount({
    tier: subscription.billing_plans.tier,
    interval: subscription.billing_interval,
    activeEmployees,
  });
  const openInvoiceId = await reuseMatchingOpenInvoice({
    organizationId,
    subscriptionId: subscription.id,
    expectedTotalSen: expected.totalSen,
  });

  if (openInvoiceId) {
    return createBillForInvoice(openInvoiceId);
  }

  const invoiceId = await createSubscriptionInvoice({
    organizationId,
    subscriptionId: subscription.id,
    plan: subscription.billing_plans,
    billingInterval: subscription.billing_interval,
    activeEmployees,
    periodStart: now,
    periodEnd,
    dueAt,
  });

  return createBillForInvoice(invoiceId);
}
