import { StatusPill } from "@hrms/ui";

import { formatDate } from "@/components/employee/employee-shared";
import { BILLING_PLAN_OPTIONS, formatRinggitFromSen } from "@/lib/billing/plans";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { getOwnerBillingSummary } from "@/app/(owner)/owner/billing/actions";

type BillingSummary = NonNullable<Awaited<ReturnType<typeof getOwnerBillingSummary>>>;

export function BillingPanel({
  summary,
  payNowAction,
}: {
  summary: BillingSummary;
  payNowAction: () => Promise<void>;
}) {
  const { subscription, activeEmployees, nextBillEstimate, invoices } = summary;
  const plan = subscription.billing_plans;
  const monthlyBase = formatRinggitFromSen(plan.base_amount_sen_monthly);
  const yearlyBase = formatRinggitFromSen(plan.base_amount_sen_yearly);

  const statusTone =
    subscription.status === "active"
      ? "success"
      : subscription.status === "trialing"
        ? "warning"
        : subscription.status === "past_due"
          ? "danger"
          : "neutral";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{plan.name}</CardTitle>
          <CardDescription>
            {monthlyBase}/mo or {yearlyBase}/yr (2 months free) · {plan.included_headcount} staff
            included
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <StatusPill label={subscription.status.replace("_", " ")} tone={statusTone} />
            <span className="text-[var(--foreground-muted)]">
              Billing: {subscription.billing_interval === "year" ? "Annual" : "Monthly"}
            </span>
            <span className="text-[var(--foreground-muted)]">
              Active employees: {activeEmployees}
            </span>
          </div>

          {subscription.status === "trialing" && subscription.trial_ends_at ? (
            <p className="text-sm text-[var(--foreground-muted)]">
              Trial ends {formatDate(subscription.trial_ends_at)}. Professional
              features are enabled during trial.
            </p>
          ) : null}

          <p className="text-sm">
            Next bill estimate: <strong>{nextBillEstimate}</strong> (incl. 8% SST)
          </p>

          <form action={payNowAction}>
            <Button type="submit">Pay now via Billplz</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change plan</CardTitle>
          <CardDescription>Select tier and billing interval before payment.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {BILLING_PLAN_OPTIONS.map((option) => (
              <div
                className="rounded-[var(--radius-md)] border border-[var(--border-primary)] p-4 text-sm"
                key={option.tier}
              >
                <p className="font-medium">{option.name}</p>
                <p className="text-[var(--foreground-muted)]">
                  {formatRinggitFromSen(option.baseAmountSenMonthly)}/mo
                </p>
                <p className="text-[var(--foreground-muted)]">
                  + {formatRinggitFromSen(option.overageAmountSen)}/extra staff
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice history</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-[var(--foreground-muted)]">No invoices yet.</p>
          ) : (
            <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-primary)]">
              <table className="w-full text-sm">
                <thead className="bg-[var(--surface-muted)] text-left text-[var(--foreground-muted)]">
                  <tr>
                    <th className="px-4 py-2 font-medium">Date</th>
                    <th className="px-4 py-2 font-medium">Type</th>
                    <th className="px-4 py-2 font-medium">Amount</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr className="border-t border-[var(--border-primary)]" key={invoice.id}>
                      <td className="px-4 py-3">
                        {formatDate(invoice.createdAt)}
                      </td>
                      <td className="px-4 py-3 capitalize">{invoice.invoiceType}</td>
                      <td className="px-4 py-3">{invoice.totalLabel}</td>
                      <td className="px-4 py-3 capitalize">{invoice.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
