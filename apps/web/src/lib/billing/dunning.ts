import { createAdminClient } from "@/lib/supabase/admin";
import { relationOne } from "@/lib/supabase/relation-one";
import {
  countActiveEmployees,
  createBillForInvoice,
  createSubscriptionInvoice,
  type BillingPlanRow,
} from "@/lib/billing/subscriptions";

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

function periodEndFrom(start: Date, interval: "month" | "year"): Date {
  return interval === "year" ? addYears(start, 1) : addMonths(start, 1);
}

export async function processBillingRenewals(): Promise<{ renewed: number; dunned: number }> {
  const admin = createAdminClient();
  const now = new Date();
  let renewed = 0;
  let dunned = 0;

  const { data: dueSubs, error } = await admin
    .from("organization_billing_subscriptions")
    .select(
      "id, organization_id, billing_interval, status, current_period_end, trial_ends_at, billing_plans(id, tier, name, base_amount_sen_monthly, base_amount_sen_yearly, overage_amount_sen, included_headcount, billplz_collection_id, trial_days)",
    )
    .in("status", ["active", "trialing"])
    .lte("current_period_end", now.toISOString());

  if (error) throw new Error(error.message);

  for (const row of dueSubs ?? []) {
    const plan = relationOne(row.billing_plans as BillingPlanRow | BillingPlanRow[] | null);
    if (!plan) continue;

    const subscription = {
      id: row.id as string,
      organization_id: row.organization_id as string,
      billing_interval: row.billing_interval as "month" | "year",
      status: row.status as string,
      billing_plans: plan,
    };

    if (subscription.status === "trialing") {
      await admin
        .from("organization_billing_subscriptions")
        .update({ status: "past_due", updated_at: now.toISOString() })
        .eq("id", subscription.id);
      dunned += 1;
    }

    const activeEmployees = await countActiveEmployees(admin, subscription.organization_id);
    const periodStart = now;
    const periodEnd = periodEndFrom(now, subscription.billing_interval);
    const dueAt = addDays(now, 7);

    const invoiceId = await createSubscriptionInvoice({
      organizationId: subscription.organization_id,
      subscriptionId: subscription.id,
      plan: subscription.billing_plans,
      billingInterval: subscription.billing_interval,
      activeEmployees,
      periodStart,
      periodEnd,
      dueAt,
    });

    await createBillForInvoice(invoiceId);

    await admin.from("notification_outbox").insert({
      organization_id: subscription.organization_id,
      channel: "email",
      template: "billing.invoice_ready",
      payload: { invoiceId },
      idempotency_key: `billing-renewal:${invoiceId}`,
    });

    renewed += 1;
  }

  const graceDays = Number(process.env.BILLING_PAST_DUE_GRACE_DAYS ?? "7");
  const { data: pastDueSubs } = await admin
    .from("organization_billing_subscriptions")
    .select("id, current_period_end")
    .eq("status", "past_due");

  for (const sub of pastDueSubs ?? []) {
    if (!sub.current_period_end) continue;
    const graceEnds = addDays(new Date(sub.current_period_end as string), graceDays);
    if (graceEnds < now) {
      await admin
        .from("organization_billing_subscriptions")
        .update({ status: "canceled", updated_at: now.toISOString() })
        .eq("id", sub.id as string);
    }
  }

  return { renewed, dunned };
}
