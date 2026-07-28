import { addCandidateSchema, type AddCandidateInput } from "@hrms/validation";

import { createAdminClient } from "@/lib/supabase/admin";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export async function addCandidateToRequisition(
  input: AddCandidateInput,
): Promise<{ applicationId: string }> {
  const parsed = addCandidateSchema.parse(input);
  const admin = createAdminClient();
  const organizationId = getOrganizationId();

  const { data: requisition } = await admin
    .from("job_requisitions")
    .select("id")
    .eq("id", parsed.requisitionId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!requisition) throw new Error("Requisition not found.");

  const { data: candidate, error: candidateError } = await admin
    .from("job_candidates")
    .insert({
      organization_id: organizationId,
      full_name: parsed.fullName.trim(),
      email: parsed.email.trim().toLowerCase(),
      phone: parsed.phone?.trim() ?? null,
    })
    .select("id")
    .single();

  if (candidateError || !candidate) {
    throw new Error(candidateError?.message ?? "Failed to create candidate.");
  }

  const { data: application, error: applicationError } = await admin
    .from("job_applications")
    .insert({
      organization_id: organizationId,
      requisition_id: parsed.requisitionId,
      candidate_id: candidate.id,
      stage: "applied",
      applied_at: new Date().toISOString(),
      stage_updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (applicationError || !application) {
    throw new Error(applicationError?.message ?? "Failed to create application.");
  }

  return { applicationId: application.id };
}

export async function getRequisitionPipeline(requisitionId: string) {
  const admin = createAdminClient();
  const organizationId = getOrganizationId();

  const { data: requisition } = await admin
    .from("job_requisitions")
    .select("id, title, description, status")
    .eq("organization_id", organizationId)
    .eq("id", requisitionId)
    .maybeSingle();

  if (!requisition) return null;

  const { data: applications } = await admin
    .from("job_applications")
    .select(
      "id, stage, employee_id, job_candidates(full_name, email, phone), job_offers(id, status, job_title, basic_salary, start_date)",
    )
    .eq("requisition_id", requisitionId)
    .order("applied_at", { ascending: false });

  return { requisition, applications: applications ?? [] };
}
