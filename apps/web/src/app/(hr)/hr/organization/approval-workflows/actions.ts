"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { requireOrganizationId } from "@/lib/auth/organization-context";
import { createAdminClient } from "@/lib/supabase/admin";

export type ApprovalWorkflowActionState = {
  error?: string;
  success?: string;
};

export async function saveApprovalWorkflowAction(
  _prevState: ApprovalWorkflowActionState,
  formData: FormData,
): Promise<ApprovalWorkflowActionState> {
  await requireRole("hr_administrator");
  const organizationId = await requireOrganizationId();
  const supabase = createAdminClient();

  const workflowId = String(formData.get("workflowId") || "").trim() || null;
  const name = String(formData.get("name") || "").trim();
  const requestType = String(formData.get("requestType") || "").trim();
  const isActive = formData.get("isActive") === "on" || formData.get("isActive") === "true";
  const stepsJson = String(formData.get("stepsJson") || "").trim();

  if (!name) {
    return { error: "Workflow name is required." };
  }
  if (!requestType) {
    return { error: "Request type is required." };
  }

  let parsedSteps: Array<{
    stepOrder: number;
    stepLabel: string;
    approverType: "manager" | "department_head" | "specific_employee" | "hr_admin";
    specificEmployeeId?: string | null;
    timeoutDays: number;
    escalationAction: "none" | "escalate_to_manager_of_manager" | "escalate_to_hr" | "escalate_to_employee";
    escalationEmployeeId?: string | null;
  }> = [];

  try {
    parsedSteps = JSON.parse(stepsJson);
  } catch {
    return { error: "Invalid steps format." };
  }

  if (!parsedSteps || parsedSteps.length === 0) {
    return { error: "At least one approval stage is required." };
  }

  let targetWorkflowId = workflowId;

  if (targetWorkflowId) {
    // Update existing workflow
    const { error: wfUpdateError } = await supabase
      .from("approval_workflows")
      .update({
        name,
        request_type: requestType,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", organizationId)
      .eq("id", targetWorkflowId);

    if (wfUpdateError) {
      return { error: `Failed to update workflow: ${wfUpdateError.message}` };
    }

    // Delete existing steps to replace with new configuration
    const { error: deleteStepsError } = await supabase
      .from("approval_workflow_steps")
      .delete()
      .eq("workflow_id", targetWorkflowId);

    if (deleteStepsError) {
      return { error: `Failed to update workflow steps: ${deleteStepsError.message}` };
    }
  } else {
    // Insert new workflow
    const { data: newWf, error: wfInsertError } = await supabase
      .from("approval_workflows")
      .insert({
        organization_id: organizationId,
        request_type: requestType,
        name,
        is_active: isActive,
      })
      .select("id")
      .single();

    if (wfInsertError || !newWf) {
      if (wfInsertError?.code === "23505") {
        return {
          error: `A workflow for request type "${requestType}" already exists in your organization. Please edit the existing workflow.`,
        };
      }
      return { error: `Failed to create workflow: ${wfInsertError?.message}` };
    }

    targetWorkflowId = newWf.id;
  }

  // Insert steps
  const stepsToInsert = parsedSteps.map((step, idx) => ({
    workflow_id: targetWorkflowId,
    organization_id: organizationId,
    step_order: idx + 1,
    step_label: step.stepLabel?.trim() || `Stage ${idx + 1}`,
    approver_type: step.approverType,
    specific_employee_id:
      step.approverType === "specific_employee" && step.specificEmployeeId ? step.specificEmployeeId : null,
    timeout_days: Number(step.timeoutDays) || 3,
    escalation_action: step.escalationAction || "none",
    escalation_employee_id:
      step.escalationAction === "escalate_to_employee" && step.escalationEmployeeId
        ? step.escalationEmployeeId
        : null,
  }));

  const { error: stepsInsertError } = await supabase
    .from("approval_workflow_steps")
    .insert(stepsToInsert);

  if (stepsInsertError) {
    return { error: `Failed to save workflow stages: ${stepsInsertError.message}` };
  }

  revalidatePath("/hr/organization/approval-workflows");
  revalidatePath("/hr/organization");
  redirect("/hr/organization/approval-workflows");
}

export async function deleteApprovalWorkflowAction(workflowId: string): Promise<{ error?: string; success?: boolean }> {
  await requireRole("hr_administrator");
  const organizationId = await requireOrganizationId();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("approval_workflows")
    .delete()
    .eq("organization_id", organizationId)
    .eq("id", workflowId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/hr/organization/approval-workflows");
  revalidatePath("/hr/organization");
  return { success: true };
}

export async function toggleApprovalWorkflowAction(
  workflowId: string,
  isActive: boolean,
): Promise<{ error?: string; success?: boolean }> {
  await requireRole("hr_administrator");
  const organizationId = await requireOrganizationId();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("approval_workflows")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("organization_id", organizationId)
    .eq("id", workflowId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/hr/organization/approval-workflows");
  revalidatePath("/hr/organization");
  return { success: true };
}
