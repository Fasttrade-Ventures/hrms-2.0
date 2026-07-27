"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { companyEventFormSchema } from "@hrms/validation";

import { actOnApproval } from "@/lib/approvals/service";
import { requireRole } from "@/lib/auth/session";
import {
  createCompanyEvent,
  deleteCompanyEvent,
  updateCompanyEvent,
} from "@/lib/calendar/company-events";
import { calendarEventsToCsv } from "@/lib/calendar/export";
import { listHrCalendarDays } from "@/lib/calendar/queries";
import { requireModule } from "@/lib/entitlements";
import type { HrCalendarFilters } from "@/lib/calendar/types";

export type CalendarActionState = {
  error?: string;
  success?: string;
};

function parseCompanyEventForm(formData: FormData) {
  const targetDepartmentIds = formData
    .getAll("targetDepartmentIds")
    .map((value) => String(value))
    .filter(Boolean);
  const branchIdRaw = String(formData.get("branchId") ?? "").trim();

  return companyEventFormSchema.safeParse({
    title: formData.get("title"),
    description: String(formData.get("description") ?? "").trim() || null,
    kind: formData.get("kind"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    branchId: branchIdRaw || null,
    targetDepartmentIds,
  });
}

function revalidateCalendarPaths() {
  revalidatePath("/hr/calendar");
  revalidatePath("/employee/calendar");
  revalidatePath("/manager/team-calendar");
}

export async function createCompanyEventAction(
  _prev: CalendarActionState,
  formData: FormData,
): Promise<CalendarActionState> {
  requireModule("calendar");
  const parsed = parseCompanyEventForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid event details." };
  }

  try {
    const session = await requireRole("hr_administrator");
    await createCompanyEvent({ form: parsed.data, actorUserId: session.user.id });
    revalidateCalendarPaths();
    return { success: "Company event created." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to create event." };
  }
}

export async function updateCompanyEventAction(
  _prev: CalendarActionState,
  formData: FormData,
): Promise<CalendarActionState> {
  requireModule("calendar");
  const eventId = String(formData.get("eventId") ?? "").trim();
  if (!eventId) return { error: "Missing event." };

  const parsed = parseCompanyEventForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid event details." };
  }

  try {
    const session = await requireRole("hr_administrator");
    await updateCompanyEvent({
      eventId,
      form: parsed.data,
      actorUserId: session.user.id,
    });
    revalidateCalendarPaths();
    return { success: "Company event updated." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to update event." };
  }
}

export async function deleteCompanyEventAction(eventId: string): Promise<CalendarActionState> {
  requireModule("calendar");
  try {
    const session = await requireRole("hr_administrator");
    await deleteCompanyEvent({ eventId, actorUserId: session.user.id });
    revalidateCalendarPaths();
    return { success: "Company event deleted." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to delete event." };
  }
}

export async function exportHrCalendarCsvAction(input: {
  year: number;
  month: number;
  filters: HrCalendarFilters;
}): Promise<{ csv: string; filename: string } | { error: string }> {
  requireModule("calendar");
  try {
    await requireRole("hr_administrator");
    const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
    if (!organizationId) return { error: "Organization not configured." };

    const events = await listHrCalendarDays({
      organizationId,
      year: input.year,
      month: input.month,
      filters: input.filters,
    });

    return {
      csv: calendarEventsToCsv(events),
      filename: `calendar-${input.year}-${String(input.month).padStart(2, "0")}.csv`,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Export failed." };
  }
}

export async function approveCalendarLeaveAction(
  _prev: CalendarActionState,
  formData: FormData,
): Promise<CalendarActionState> {
  requireModule("calendar");
  const stepId = String(formData.get("stepId") ?? "").trim();
  if (!stepId) return { error: "Missing approval step." };

  try {
    const session = await requireRole("hr_administrator");
    const employeeId = session.membership.employeeId;
    if (!employeeId) return { error: "No employee record linked to approve leave." };

    await actOnApproval({
      stepId,
      actorEmployeeId: employeeId,
      actorUserId: session.user.id,
      organizationId: session.membership.organizationId,
      event: "approve",
      comment: String(formData.get("comment") ?? "").trim() || undefined,
    });

    revalidateCalendarPaths();
    redirect("/hr/calendar?approved=1");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    return { error: error instanceof Error ? error.message : "Failed to approve leave." };
  }
}

export async function rejectCalendarLeaveAction(
  _prev: CalendarActionState,
  formData: FormData,
): Promise<CalendarActionState> {
  requireModule("calendar");
  const stepId = String(formData.get("stepId") ?? "").trim();
  if (!stepId) return { error: "Missing approval step." };

  try {
    const session = await requireRole("hr_administrator");
    const employeeId = session.membership.employeeId;
    if (!employeeId) return { error: "No employee record linked to reject leave." };

    await actOnApproval({
      stepId,
      actorEmployeeId: employeeId,
      actorUserId: session.user.id,
      organizationId: session.membership.organizationId,
      event: "reject",
      comment: String(formData.get("comment") ?? "").trim() || undefined,
    });

    revalidateCalendarPaths();
    redirect("/hr/calendar?rejected=1");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    return { error: error instanceof Error ? error.message : "Failed to reject leave." };
  }
}
