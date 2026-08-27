"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { actOnApproval } from "@/lib/approvals/service";
import { requireRole } from "@/lib/auth/session";
import { requireOrganizationId } from "@/lib/auth/organization-context";

export type HrOperationsActionState = {
  error?: string;
  success?: string;
};


export async function approveRequestAsHr(
  _prev: HrOperationsActionState,
  formData: FormData,
): Promise<HrOperationsActionState> {
  const stepId = String(formData.get("stepId") ?? "");
  const comment = String(formData.get("comment") ?? "").trim();

  if (!stepId) return { error: "Missing approval step." };
  if (comment.length < 3) {
    return { error: "Override comment is required (min 3 characters)." };
  }

  try {
    const session = await requireRole("hr_administrator");
    const organizationId = await requireOrganizationId();
    await actOnApproval({
      stepId,
      actorEmployeeId: session.membership.employeeId,
      actorUserId: session.user.id,
      organizationId,
      event: "approve",
      comment,
      hrOverride: true,
    });

    const { logAuditEvent } = await import("@/lib/audit/log-event");
    await logAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      action: "hr.operations.override_approve",
      resourceType: "approval_step",
      resourceId: stepId,
      metadata: { comment },
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
  const comment = String(formData.get("comment") ?? "").trim();

  if (!stepId) return { error: "Missing approval step." };
  if (comment.length < 3) {
    return { error: "Override comment is required (min 3 characters)." };
  }

  try {
    const session = await requireRole("hr_administrator");
    const organizationId = await requireOrganizationId();
    await actOnApproval({
      stepId,
      actorEmployeeId: session.membership.employeeId,
      actorUserId: session.user.id,
      organizationId,
      event: "reject",
      comment,
      hrOverride: true,
    });

    const { logAuditEvent } = await import("@/lib/audit/log-event");
    await logAuditEvent({
      organizationId,
      actorUserId: session.user.id,
      action: "hr.operations.override_reject",
      resourceType: "approval_step",
      resourceId: stepId,
      metadata: { comment },
    });

    revalidatePath("/hr/operations");
    revalidatePath("/hr/dashboard");
    redirect("/hr/operations?rejected=1");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    return { error: error instanceof Error ? error.message : "Failed to reject request." };
  }
}
