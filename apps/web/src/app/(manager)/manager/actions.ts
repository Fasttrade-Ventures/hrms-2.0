"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { actOnApproval } from "@/lib/approvals/service";
import { requireManagerContext } from "@/lib/manager/context";

export type ManagerActionState = {
  error?: string;
  success?: string;
};

export async function approveRequest(
  _prev: ManagerActionState,
  formData: FormData,
): Promise<ManagerActionState> {
  const stepId = String(formData.get("stepId") ?? "");
  const comment = String(formData.get("comment") ?? "").trim() || undefined;

  if (!stepId) return { error: "Missing approval step." };

  try {
    const { employeeId, organizationId, userId } = await requireManagerContext();
    await actOnApproval({
      stepId,
      actorEmployeeId: employeeId,
      actorUserId: userId,
      organizationId,
      event: "approve",
      comment,
    });

    revalidatePath("/manager/approvals");
    revalidatePath("/manager/dashboard");
    redirect("/manager/approvals?approved=1");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    return { error: error instanceof Error ? error.message : "Failed to approve request." };
  }
}

export async function rejectRequest(
  _prev: ManagerActionState,
  formData: FormData,
): Promise<ManagerActionState> {
  const stepId = String(formData.get("stepId") ?? "");
  const comment = String(formData.get("comment") ?? "").trim() || undefined;

  if (!stepId) return { error: "Missing approval step." };

  try {
    const { employeeId, organizationId, userId } = await requireManagerContext();
    await actOnApproval({
      stepId,
      actorEmployeeId: employeeId,
      actorUserId: userId,
      organizationId,
      event: "reject",
      comment,
    });

    revalidatePath("/manager/approvals");
    revalidatePath("/manager/dashboard");
    redirect("/manager/approvals?rejected=1");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    return { error: error instanceof Error ? error.message : "Failed to reject request." };
  }
}
