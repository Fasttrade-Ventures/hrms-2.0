"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { actOnApproval } from "@/lib/approvals/service";
import { requireRole } from "@/lib/auth/session";

export type HrOperationsActionState = {
  error?: string;
  success?: string;
};

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export async function approveRequestAsHr(
  _prev: HrOperationsActionState,
  formData: FormData,
): Promise<HrOperationsActionState> {
  const stepId = String(formData.get("stepId") ?? "");
  const comment = String(formData.get("comment") ?? "").trim() || undefined;

  if (!stepId) return { error: "Missing approval step." };

  try {
    const session = await requireRole("hr_administrator");
    const organizationId = getOrganizationId();
    await actOnApproval({
      stepId,
      actorEmployeeId: session.membership.employeeId,
      actorUserId: session.user.id,
      organizationId,
      event: "approve",
      comment,
      hrOverride: true,
    });

    revalidatePath("/hr/operations");
    revalidatePath("/hr/dashboard");
    redirect("/hr/operations?approved=1");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    return { error: error instanceof Error ? error.message : "Failed to approve request." };
  }
}

export async function rejectRequestAsHr(
  _prev: HrOperationsActionState,
  formData: FormData,
): Promise<HrOperationsActionState> {
  const stepId = String(formData.get("stepId") ?? "");
  const comment = String(formData.get("comment") ?? "").trim() || undefined;

  if (!stepId) return { error: "Missing approval step." };

  try {
    const session = await requireRole("hr_administrator");
    const organizationId = getOrganizationId();
    await actOnApproval({
      stepId,
      actorEmployeeId: session.membership.employeeId,
      actorUserId: session.user.id,
      organizationId,
      event: "reject",
      comment,
      hrOverride: true,
    });

    revalidatePath("/hr/operations");
    revalidatePath("/hr/dashboard");
    redirect("/hr/operations?rejected=1");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    return { error: error instanceof Error ? error.message : "Failed to reject request." };
  }
}
