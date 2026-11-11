import { addCandidateSchema, type AddCandidateInput } from "@hrms/validation";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireOrganizationId } from "@/lib/auth/organization-context";


export async function addCandidateToRequisition(
  input: AddCandidateInput,
): Promise<{ applicationId: string }> {
  const parsed = addCandidateSchema.parse(input);
  const admin = createAdminClient();
  const organizationId = await requireOrganizationId();

  const { data: requisition } = await admin
    .from("job_requisitions")
    .select("id, status")
    .eq("id", parsed.requisitionId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!requisition) throw new Error("Requisition not found.");
  if (requisition.status !== "open") {
    throw new Error("Candidates can only be added to open requisitions.");
  }

  const email = parsed.email.trim().toLowerCase();

  const { data: existing } = await admin
    .from("job_candidates")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("email", email)
    .maybeSingle();

  let candidateId = existing?.id;
  if (!candidateId) {
    const { data: candidate, error } = await admin
      .from("job_candidates")
      .insert({
        organization_id: organizationId,
        full_name: parsed.fullName.trim(),
        email,
        phone: parsed.phone?.trim() ?? null,
        source: parsed.source?.trim() || null,
      })
      .select("id")
      .single();
    if (error || !candidate) throw new Error(error?.message ?? "Failed to create candidate.");
    candidateId = candidate.id;
  } else if (parsed.source?.trim()) {
    await admin.from("job_candidates").update({ source: parsed.source.trim() }).eq("id", candidateId);
  }

  const { data: existingApplication } = await admin
    .from("job_applications")
    .select("id")
    .eq("requisition_id", parsed.requisitionId)
    .eq("candidate_id", candidateId)
    .maybeSingle();

  if (existingApplication) {
    throw new Error("This candidate is already on this requisition.");
  }

  const { data: application, error: applicationError } = await admin
    .from("job_applications")
    .insert({
      organization_id: organizationId,
      requisition_id: parsed.requisitionId,
      candidate_id: candidateId,
      stage: "applied",
      applied_at: new Date().toISOString(),
      stage_updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (applicationError || !application) {
    if (applicationError?.code === "23505") {
      throw new Error("This candidate is already on this requisition.");
    }
    throw new Error(applicationError?.message ?? "Failed to create application.");
  }

  return { applicationId: application.id };
}

export async function getRequisitionPipeline(requisitionId: string) {
  const admin = createAdminClient();
  const organizationId = await requireOrganizationId();

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
