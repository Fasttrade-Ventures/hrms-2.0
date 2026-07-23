"use server";

import type { ClaimRequestInput, LeaveRequestInput } from "@hrms/validation";
import { claimRequestSchema, leaveRequestSchema } from "@hrms/validation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { clockIn, clockOut } from "@/lib/employee/attendance";
import { createLeaveRequest } from "@/lib/employee/leave";
import { requireEmployeeContext } from "@/lib/employee/leave";
import { submitEmployeeRequest } from "@/lib/employee/submit-request";
import { createClient } from "@/lib/supabase/server";

export type EmployeeActionState = {
  error?: string;
  success?: string;
};

function readCheckbox(formData: FormData, name: string): boolean {
  return formData.get(name) === "on" || formData.get(name) === "true";
}

export async function applyLeave(
  _prev: EmployeeActionState,
  formData: FormData,
): Promise<EmployeeActionState> {
  const parsed = leaveRequestSchema.safeParse({
    leaveTypeId: String(formData.get("leaveTypeId") ?? ""),
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
    halfDay: readCheckbox(formData, "halfDay"),
    reason: String(formData.get("reason") ?? "").trim() || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid leave request." };
  }

  try {
    const requestId = await createLeaveRequest(parsed.data);
    revalidatePath("/employee/leave");
    revalidatePath("/employee/dashboard");
    redirect(`/employee/leave/${requestId}?submitted=1`);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to apply leave." };
  }
}

export async function submitClaim(
  _prev: EmployeeActionState,
  formData: FormData,
): Promise<EmployeeActionState> {
  const parsed = claimRequestSchema.safeParse({
    claimTypeId: String(formData.get("claimTypeId") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    receiptDate: String(formData.get("receiptDate") ?? ""),
    description: String(formData.get("description") ?? "").trim() || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid claim." };
  }

  try {
    const { employeeId, organizationId } = await requireEmployeeContext();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("claims")
      .insert({
        organization_id: organizationId,
        employee_id: employeeId,
        claim_type_id: parsed.data.claimTypeId,
        amount: parsed.data.amount,
        receipt_date: parsed.data.receiptDate,
        description: parsed.data.description ?? null,
        status: "draft",
      })
      .select("id, claim_types(name)")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Failed to submit claim.");

    await submitEmployeeRequest({
      requestType: "claim",
      sourceTable: "claims",
      sourceId: data.id,
      payload: {
        claimTypeName: (data.claim_types as { name?: string } | null)?.name ?? "Claim",
        amount: parsed.data.amount,
        receiptDate: parsed.data.receiptDate,
      },
    });

    revalidatePath("/employee/claims");
    return { success: "Claim submitted for approval." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to submit claim." };
  }
}

export async function submitOvertime(
  _prev: EmployeeActionState,
  formData: FormData,
): Promise<EmployeeActionState> {
  const workDate = String(formData.get("workDate") ?? "");
  const hours = String(formData.get("hours") ?? "");
  const rateType = String(formData.get("rateType") ?? "1.5");
  const reason = String(formData.get("reason") ?? "").trim() || undefined;

  if (!workDate || !hours) {
    return { error: "Work date and hours are required." };
  }

  try {
    const { employeeId, organizationId } = await requireEmployeeContext();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("overtime_requests")
      .insert({
        organization_id: organizationId,
        employee_id: employeeId,
        work_date: workDate,
        hours,
        rate_type: rateType,
        reason: reason ?? null,
        status: "draft",
      })
      .select("id")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Failed to submit overtime.");

    await submitEmployeeRequest({
      requestType: "overtime",
      sourceTable: "overtime_requests",
      sourceId: data.id,
      payload: { workDate, hours, rateType, reason },
    });

    revalidatePath("/employee/overtime");
    return { success: "Overtime request submitted." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to submit overtime." };
  }
}

export async function submitReplacementCredit(
  _prev: EmployeeActionState,
  formData: FormData,
): Promise<EmployeeActionState> {
  const workDate = String(formData.get("workDate") ?? "");
  const creditDays = String(formData.get("creditDays") ?? "1");
  const description = String(formData.get("description") ?? "").trim() || undefined;

  if (!workDate) {
    return { error: "Work date is required." };
  }

  try {
    const { employeeId, organizationId } = await requireEmployeeContext();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("replacement_credits")
      .insert({
        organization_id: organizationId,
        employee_id: employeeId,
        work_date: workDate,
        credit_days: creditDays,
        description: description ?? null,
        status: "draft",
      })
      .select("id")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Failed to submit replacement credit.");

    await submitEmployeeRequest({
      requestType: "replacement_credit",
      sourceTable: "replacement_credits",
      sourceId: data.id,
      payload: { workDate, creditDays, description },
    });

    revalidatePath("/employee/replacement-credit");
    return { success: "Replacement credit submitted." };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to submit replacement credit.",
    };
  }
}

export async function submitLateReport(
  _prev: EmployeeActionState,
  formData: FormData,
): Promise<EmployeeActionState> {
  const requestDate = String(formData.get("requestDate") ?? "");
  const actualArrivalTime = String(formData.get("actualArrivalTime") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || undefined;

  if (!requestDate || !actualArrivalTime) {
    return { error: "Date and arrival time are required." };
  }

  try {
    const { employeeId, organizationId } = await requireEmployeeContext();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("late_requests")
      .insert({
        organization_id: organizationId,
        employee_id: employeeId,
        request_date: requestDate,
        actual_arrival_time: actualArrivalTime,
        reason: reason ?? null,
        status: "draft",
      })
      .select("id")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Failed to submit late report.");

    await submitEmployeeRequest({
      requestType: "late",
      sourceTable: "late_requests",
      sourceId: data.id,
      payload: { requestDate, actualArrivalTime, reason },
    });

    revalidatePath("/employee/report-late");
    return { success: "Late report submitted." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to submit late report." };
  }
}

export async function submitManualAttendance(
  _prev: EmployeeActionState,
  formData: FormData,
): Promise<EmployeeActionState> {
  const requestDate = String(formData.get("requestDate") ?? "");
  const clockInTime = String(formData.get("clockInTime") ?? "") || null;
  const clockOutTime = String(formData.get("clockOutTime") ?? "") || null;
  const reason = String(formData.get("reason") ?? "").trim() || undefined;

  if (!requestDate) {
    return { error: "Date is required." };
  }

  try {
    const { employeeId, organizationId } = await requireEmployeeContext();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("attendance_requests")
      .insert({
        organization_id: organizationId,
        employee_id: employeeId,
        request_date: requestDate,
        clock_in_time: clockInTime,
        clock_out_time: clockOutTime,
        reason: reason ?? null,
        status: "draft",
      })
      .select("id")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Failed to submit manual attendance.");

    await submitEmployeeRequest({
      requestType: "attendance",
      sourceTable: "attendance_requests",
      sourceId: data.id,
      payload: { requestDate, clockInTime, clockOutTime, reason },
    });

    revalidatePath("/employee/manual-attendance");
    return { success: "Manual attendance request submitted." };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to submit manual attendance.",
    };
  }
}

export async function employeeClockIn(): Promise<EmployeeActionState> {
  try {
    await clockIn();
    revalidatePath("/employee/attendance");
    revalidatePath("/employee/dashboard");
    return { success: "Clocked in successfully." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to clock in." };
  }
}

export async function employeeClockOut(): Promise<EmployeeActionState> {
  try {
    await clockOut();
    revalidatePath("/employee/attendance");
    revalidatePath("/employee/dashboard");
    return { success: "Clocked out successfully." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to clock out." };
  }
}

export type { LeaveRequestInput, ClaimRequestInput };
