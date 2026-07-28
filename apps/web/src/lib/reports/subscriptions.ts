import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ReportFilters, ReportSlug } from "@/lib/reports/types";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export type ReportSchedule = "daily" | "weekly" | "monthly";

export type ReportSubscriptionRow = {
  id: string;
  reportSlug: ReportSlug;
  schedule: ReportSchedule;
  filters: ReportFilters;
  recipientUserId: string;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string;
};

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function addMonths(isoDate: string, months: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

export function computeNextRunAt(schedule: ReportSchedule, fromDate = new Date()): string {
  const today = fromDate.toISOString().slice(0, 10);
  switch (schedule) {
    case "daily":
      return addDays(today, 1);
    case "weekly":
      return addDays(today, 7);
    case "monthly":
      return addMonths(today, 1);
  }
}

export async function listReportSubscriptionsForUser(userId: string): Promise<ReportSubscriptionRow[]> {
  await requireRole("hr_administrator", "director");
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  const { data, error } = await supabase
    .from("report_subscriptions")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("recipient_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    reportSlug: row.report_slug as ReportSlug,
    schedule: row.schedule as ReportSchedule,
    filters: (row.filters ?? {}) as ReportFilters,
    recipientUserId: row.recipient_user_id,
    enabled: row.enabled,
    lastRunAt: row.last_run_at,
    nextRunAt: row.next_run_at,
  }));
}

export async function upsertReportSubscription(input: {
  reportSlug: ReportSlug;
  schedule: ReportSchedule;
  filters: ReportFilters;
  recipientUserId: string;
}): Promise<void> {
  await requireRole("hr_administrator", "director");
  const organizationId = getOrganizationId();
  const supabase = await createClient();
  const nextRunAt = computeNextRunAt(input.schedule);

  const { data: existing } = await supabase
    .from("report_subscriptions")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("recipient_user_id", input.recipientUserId)
    .eq("report_slug", input.reportSlug)
    .maybeSingle();

  const payload = {
    organization_id: organizationId,
    report_slug: input.reportSlug,
    schedule: input.schedule,
    filters: input.filters,
    recipient_user_id: input.recipientUserId,
    enabled: true,
    next_run_at: nextRunAt,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase.from("report_subscriptions").update(payload).eq("id", existing.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.from("report_subscriptions").insert(payload);
  if (error) throw new Error(error.message);
}

export async function deleteReportSubscription(subscriptionId: string): Promise<void> {
  await requireRole("hr_administrator", "director");
  const organizationId = getOrganizationId();
  const supabase = await createClient();
  const { error } = await supabase
    .from("report_subscriptions")
    .delete()
    .eq("id", subscriptionId)
    .eq("organization_id", organizationId);
  if (error) throw new Error(error.message);
}

export async function dispatchDueReportSubscriptions(asOf = new Date()): Promise<number> {
  const organizationId = getOrganizationId();
  const admin = createAdminClient();
  const asOfIso = asOf.toISOString();

  const { data: subscriptions, error } = await admin
    .from("report_subscriptions")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("enabled", true)
    .lte("next_run_at", asOfIso);

  if (error) throw new Error(error.message);

  const { queueNotification } = await import("@/lib/notifications/queue");
  const { buildReportSearchParams } = await import("@/lib/reports/filters");
  const { getReportDefinition } = await import("@/lib/reports/catalog");

  let queued = 0;

  for (const subscription of subscriptions ?? []) {
    const slug = subscription.report_slug as ReportSlug;
    const filters = (subscription.filters ?? {}) as ReportFilters;
    const definition = getReportDefinition(slug);
    const params = buildReportSearchParams(filters);
    const href = `/hr/reports/${slug}?${params.toString()}`;
    const runDate = asOf.toISOString().slice(0, 10);

    await queueNotification({
      organizationId,
      recipientUserId: subscription.recipient_user_id,
      channel: "email",
      template: "reports.scheduled",
      payload: {
        reportTitle: definition?.title ?? slug,
        rowCount: 0,
        href,
        schedule: subscription.schedule,
      },
      idempotencyKey: `report-sub:${subscription.id}:${runDate}`,
    });

    await admin
      .from("report_subscriptions")
      .update({
        last_run_at: asOfIso,
        next_run_at: computeNextRunAt(subscription.schedule as ReportSchedule, asOf),
        updated_at: asOfIso,
      })
      .eq("id", subscription.id);

    queued += 1;
  }

  return queued;
}
