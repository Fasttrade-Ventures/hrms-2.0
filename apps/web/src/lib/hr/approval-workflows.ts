import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { requireOrganizationId } from "@/lib/auth/organization-context";
import type { ApproverType, EscalationAction } from "@/lib/approvals/types";

export type ApprovalWorkflowStepData = {
  id?: string;
  stepOrder: number;
  stepLabel: string;
  approverType: ApproverType;
  specificEmployeeId?: string | null;
  specificEmployeeName?: string | null;
  timeoutDays: number;
  escalationAction: EscalationAction;
  escalationEmployeeId?: string | null;
  escalationEmployeeName?: string | null;
};

export type ApprovalWorkflowRow = {
  id: string;
  organizationId: string;
  requestType: string;
  name: string;
  isActive: boolean;
  stepsCount: number;
  steps: ApprovalWorkflowStepData[];
  createdAt: string;
  updatedAt: string;
};

export type CandidateOption = {
  id: string;
  fullName: string;
  jobTitle?: string | null;
  departmentName?: string | null;
};

type RawStepRow = {
  id: string;
  step_order: number;
  step_label: string | null;
  approver_type: ApproverType;
  specific_employee_id: string | null;
  timeout_days: number | null;
  escalation_action: EscalationAction | null;
  escalation_employee_id: string | null;
  specific_employee?: { full_name: string } | null;
  escalation_employee?: { full_name: string } | null;
};

type RawCandidateRow = {
  id: string;
  full_name: string;
  job_title: string | null;
  departments: { name: string | null } | null;
};

export async function listApprovalWorkflows(): Promise<ApprovalWorkflowRow[]> {
  await requireRole("hr_administrator");
  const organizationId = await requireOrganizationId();
  const supabase = await createClient();

  const { data: workflows, error } = await supabase
    .from("approval_workflows")
    .select(`
      id,
      organization_id,
      request_type,
      name,
      is_active,
      created_at,
      updated_at,
      approval_workflow_steps (
        id,
        step_order,
        step_label,
        approver_type,
        specific_employee_id,
        timeout_days,
        escalation_action,
        escalation_employee_id,
        specific_employee:employees!approval_workflow_steps_specific_employee_id_fkey(full_name),
        escalation_employee:employees!approval_workflow_steps_escalation_employee_id_fkey(full_name)
      )
    `)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list approval workflows: ${error.message}`);
  }

  return (workflows ?? []).map((wf) => {
    const rawSteps = (wf.approval_workflow_steps ?? []) as unknown as RawStepRow[];
    const sortedSteps = [...rawSteps].sort((a, b) => a.step_order - b.step_order);

    const steps: ApprovalWorkflowStepData[] = sortedSteps.map((s) => ({
      id: s.id,
      stepOrder: s.step_order,
      stepLabel: s.step_label || `Step ${s.step_order}`,
      approverType: s.approver_type,
      specificEmployeeId: s.specific_employee_id,
      specificEmployeeName: s.specific_employee?.full_name ?? null,
      timeoutDays: s.timeout_days ?? 3,
      escalationAction: s.escalation_action ?? "none",
      escalationEmployeeId: s.escalation_employee_id,
      escalationEmployeeName: s.escalation_employee?.full_name ?? null,
    }));

    return {
      id: wf.id,
      organizationId: wf.organization_id,
      requestType: wf.request_type,
      name: wf.name,
      isActive: wf.is_active,
      stepsCount: steps.length,
      steps,
      createdAt: wf.created_at,
      updatedAt: wf.updated_at,
    };
  });
}

export async function getApprovalWorkflow(id: string): Promise<ApprovalWorkflowRow | null> {
  await requireRole("hr_administrator");
  const organizationId = await requireOrganizationId();
  const supabase = await createClient();

  const { data: wf, error } = await supabase
    .from("approval_workflows")
    .select(`
      id,
      organization_id,
      request_type,
      name,
      is_active,
      created_at,
      updated_at,
      approval_workflow_steps (
        id,
        step_order,
        step_label,
        approver_type,
        specific_employee_id,
        timeout_days,
        escalation_action,
        escalation_employee_id
      )
    `)
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();

  if (error || !wf) return null;

  const rawSteps = (wf.approval_workflow_steps ?? []) as unknown as RawStepRow[];
  const sortedSteps = [...rawSteps].sort((a, b) => a.step_order - b.step_order);

  const steps: ApprovalWorkflowStepData[] = sortedSteps.map((s) => ({
    id: s.id,
    stepOrder: s.step_order,
    stepLabel: s.step_label || `Step ${s.step_order}`,
    approverType: s.approver_type,
    specificEmployeeId: s.specific_employee_id,
    timeoutDays: s.timeout_days ?? 3,
    escalationAction: s.escalation_action ?? "none",
    escalationEmployeeId: s.escalation_employee_id,
  }));

  return {
    id: wf.id,
    organizationId: wf.organization_id,
    requestType: wf.request_type,
    name: wf.name,
    isActive: wf.is_active,
    stepsCount: steps.length,
    steps,
    createdAt: wf.created_at,
    updatedAt: wf.updated_at,
  };
}

export async function listApproverCandidates(): Promise<CandidateOption[]> {
  await requireRole("hr_administrator");
  const organizationId = await requireOrganizationId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("employees")
    .select("id, full_name, job_title, departments(name)")
    .eq("organization_id", organizationId)
    .eq("employment_status", "active")
    .order("full_name", { ascending: true });

  if (error || !data) return [];

  const candidates = data as unknown as RawCandidateRow[];

  return candidates.map((e) => ({
    id: e.id,
    fullName: e.full_name,
    jobTitle: e.job_title,
    departmentName: e.departments?.name ?? null,
  }));
}
