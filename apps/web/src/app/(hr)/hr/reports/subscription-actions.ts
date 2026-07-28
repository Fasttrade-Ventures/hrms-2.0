"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth/session";
import { requireProfessionalTier } from "@/lib/entitlements";
import {
  deleteReportSubscription,
  upsertReportSubscription,
  type ReportSchedule,
} from "@/lib/reports/subscriptions";
import type { ReportFilters, ReportSlug } from "@/lib/reports/types";

export type ReportActionState = {
  error?: string;
  success?: string;
};

export async function subscribeToReportAction(
  _prev: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  try {
    await requireProfessionalTier();
    const session = await requireAuth();
    const slug = String(formData.get("slug") ?? "") as ReportSlug;
    const schedule = String(formData.get("schedule") ?? "weekly") as ReportSchedule;
    const filters = JSON.parse(String(formData.get("filters") ?? "{}")) as ReportFilters;

    await upsertReportSubscription({
      reportSlug: slug,
      schedule,
      filters,
      recipientUserId: session.user.id,
    });

    revalidatePath(`/hr/reports/${slug}`);
    return { success: "Report subscription saved." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to save subscription." };
  }
}

export async function unsubscribeFromReportAction(
  _prev: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  try {
    await requireProfessionalTier();
    const subscriptionId = String(formData.get("subscriptionId") ?? "");
    if (!subscriptionId) return { error: "Subscription ID is required." };
    await deleteReportSubscription(subscriptionId);
    revalidatePath("/hr/reports");
    return { success: "Subscription removed." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to remove subscription." };
  }
}
