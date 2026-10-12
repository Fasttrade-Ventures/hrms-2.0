"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  applyBehalfClaimSchema,
  applyBehalfLateSchema,
  applyBehalfLeaveSchema,
  applyBehalfOvertimeSchema,
  applyBehalfReplacementCreditSchema,
} from "@hrms/validation";

import { requireRole } from "@/lib/auth/session";
import {
  createBehalfClaim,
  createBehalfLate,
  createBehalfLeave,
  createBehalfOvertime,
  createBehalfReplacementCredit,
} from "@/lib/hr/apply-behalf";

export type ApplyBehalfActionState = {
  error?: string;
  success?: string;
};

function readCheckbox(formData: FormData, name: string): boolean {
  return formData.get(name) === "on" || formData.get(name) === "true";
}

export async function submitBehalfLeave(
  _prev: ApplyBehalfActionState,
  formData: FormData,
): Promise<ApplyBehalfActionState> {
  const session = await requireRole("hr_administrator");

  const parsed = applyBehalfLeaveSchema.safeParse({
    employeeId: String(formData.get("employeeId") ?? "").trim(),
    leaveTypeId: String(formData.get("leaveTypeId") ?? "").trim(),
    startDate: String(formData.get("startDate") ?? "").trim(),
    endDate: String(formData.get("endDate") ?? "").trim(),
    halfDay: readCheckbox(formData, "halfDay"),
    reason: String(formData.get("reason") ?? "").trim() || undefined,
    overrideReason: String(formData.get("overrideReason") ?? "").trim() || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid leave details." };
  }

  try {
    await createBehalfLeave(parsed.data, session.user.id);
    revalidatePath("/hr/apply-behalf");
    redirect("/hr/apply-behalf?created=leave");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    return {
      error: error instanceof Error ? error.message : "Failed to submit leave on behalf.",
    };
  }
}

export async function submitBehalfLate(
  _prev: ApplyBehalfActionState,
  formData: FormData,
): Promise<ApplyBehalfActionState> {
  const session = await requireRole("hr_administrator");

  const parsed = applyBehalfLateSchema.safeParse({
    employeeId: String(formData.get("employeeId") ?? "").trim(),
    requestDate: String(formData.get("requestDate") ?? "").trim(),
    actualArrivalTime: String(formData.get("actualArrivalTime") ?? "").trim(),
    reason: String(formData.get("reason") ?? "").trim() || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid late report details." };
  }

  try {
    await createBehalfLate(parsed.data, session.user.id);
    revalidatePath("/hr/apply-behalf");
    redirect("/hr/apply-behalf?created=late");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    return {
      error: error instanceof Error ? error.message : "Failed to submit late report on behalf.",
    };
  }
}

export async function submitBehalfClaim(
  _prev: ApplyBehalfActionState,
  formData: FormData,
): Promise<ApplyBehalfActionState> {
  const session = await requireRole("hr_administrator");

  const isMileage = readCheckbox(formData, "isMileage");
  const parsed = applyBehalfClaimSchema.safeParse({
    employeeId: String(formData.get("employeeId") ?? "").trim(),
    claimTypeId: String(formData.get("claimTypeId") ?? "").trim(),
    amount: String(formData.get("amount") ?? "").trim(),
    receiptDate: String(formData.get("receiptDate") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || undefined,
    isMileage,
    distanceKm: String(formData.get("distanceKm") ?? "").trim() || undefined,
    ratePerKm: String(formData.get("ratePerKm") ?? "").trim() || undefined,
    origin: String(formData.get("origin") ?? "").trim() || undefined,
    destination: String(formData.get("destination") ?? "").trim() || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid claim details." };
  }

  try {
    await createBehalfClaim(parsed.data, session.user.id);
    revalidatePath("/hr/apply-behalf");
    redirect("/hr/apply-behalf?created=claim");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    return {
      error: error instanceof Error ? error.message : "Failed to submit claim on behalf.",
    };
  }
}

export async function submitBehalfOvertime(
  _prev: ApplyBehalfActionState,
  formData: FormData,
): Promise<ApplyBehalfActionState> {
  const session = await requireRole("hr_administrator");

  const parsed = applyBehalfOvertimeSchema.safeParse({
    employeeId: String(formData.get("employeeId") ?? "").trim(),
    workDate: String(formData.get("workDate") ?? "").trim(),
    hours: String(formData.get("hours") ?? "").trim(),
    rateType: String(formData.get("rateType") ?? "1.5").trim(),
    reason: String(formData.get("reason") ?? "").trim() || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid overtime details." };
  }

  try {
    await createBehalfOvertime(parsed.data, session.user.id);
    revalidatePath("/hr/apply-behalf");
    redirect("/hr/apply-behalf?created=overtime");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    return {
      error: error instanceof Error ? error.message : "Failed to submit overtime on behalf.",
    };
  }
}

export async function submitBehalfReplacementCredit(
  _prev: ApplyBehalfActionState,
  formData: FormData,
): Promise<ApplyBehalfActionState> {
  const session = await requireRole("hr_administrator");

  const parsed = applyBehalfReplacementCreditSchema.safeParse({
    employeeId: String(formData.get("employeeId") ?? "").trim(),
    workDate: String(formData.get("workDate") ?? "").trim(),
    creditDays: String(formData.get("creditDays") ?? "1").trim(),
    description: String(formData.get("description") ?? "").trim() || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid replacement credit details." };
  }

  try {
    await createBehalfReplacementCredit(parsed.data, session.user.id);
    revalidatePath("/hr/apply-behalf");
    redirect("/hr/apply-behalf?created=replacement");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    return {
      error: error instanceof Error ? error.message : "Failed to submit replacement credit on behalf.",
    };
  }
}

