"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { applyBehalfLateSchema, applyBehalfLeaveSchema } from "@hrms/validation";

import { requireBranchAdminContext } from "@/lib/branch-admin/context";
import { createBehalfLate, createBehalfLeave } from "@/lib/hr/apply-behalf";

export type ApplyBehalfActionState = {
  error?: string;
  success?: string;
};

function readCheckbox(formData: FormData, name: string): boolean {
  return formData.get(name) === "on" || formData.get(name) === "true";
}

export async function submitBranchBehalfLeave(
  _prev: ApplyBehalfActionState,
  formData: FormData,
): Promise<ApplyBehalfActionState> {
  const context = await requireBranchAdminContext();

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
    await createBehalfLeave(parsed.data, context.session.user.id, {
      branchIds: context.branchIds,
    });
    revalidatePath("/branch-admin/apply-behalf");
    redirect("/branch-admin/apply-behalf?created=leave");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    return {
      error: error instanceof Error ? error.message : "Failed to submit leave on behalf.",
    };
  }
}

export async function submitBranchBehalfLate(
  _prev: ApplyBehalfActionState,
  formData: FormData,
): Promise<ApplyBehalfActionState> {
  const context = await requireBranchAdminContext();

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
    await createBehalfLate(parsed.data, context.session.user.id, {
      branchIds: context.branchIds,
    });
    revalidatePath("/branch-admin/apply-behalf");
    redirect("/branch-admin/apply-behalf?created=late");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    return {
      error: error instanceof Error ? error.message : "Failed to submit late report on behalf.",
    };
  }
}
