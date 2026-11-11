import { addCandidateSchema, type AddCandidateInput } from "@hrms/validation";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireOrganizationId } from "@/lib/auth/organization-context";

import type { RequisitionStatus } from "./requisition-status";


export type ApplicationStageHistoryRow = {
  id: string;
  from_stage: string | null;
  to_stage: string;
  notes: string | null;
  created_at: string;
  changed_by: string | null;
};

export type ApplicationDetail = {
  application: {
    id: string;
    stage: string;
    employee_id: string | null;
    applied_at: string;
    stage_updated_at: string;
    requisition_id: string;
  };
  candidate: {
    full_name: string;
    email: string;
    phone: string | null;
    source: string | null;
  };
  offer: {
    id: string;
    status: string;
    job_title: string;
    basic_salary: number;
    start_date: string;
    generated_file_id: string | null;
  } | null;
  history: ApplicationStageHistoryRow[];
  requisition: {
    id: string;
    title: string;
    status: RequisitionStatus;
  };
};


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
      "id, stage, employee_id, stage_updated_at, job_candidates(full_name, email, phone), job_offers(id, status, job_title, basic_salary, start_date)",
    )
    .eq("requisition_id", requisitionId)
    .order("applied_at", { ascending: false });

  return { requisition, applications: applications ?? [] };
}

export async function getApplicationDetail(
  requisitionId: string,
  applicationId: string,
): Promise<ApplicationDetail | null> {
  const admin = createAdminClient();
  const organizationId = await requireOrganizationId();

  const { data: requisition } = await admin
    .from("job_requisitions")
    .select("id, title, status")
    .eq("id", requisitionId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!requisition) return null;

  const { data: application } = await admin
    .from("job_applications")
    .select(
      "id, stage, employee_id, applied_at, stage_updated_at, requisition_id, job_candidates(full_name, email, phone, source), job_offers(id, status, job_title, basic_salary, start_date, generated_file_id)",
    )
    .eq("id", applicationId)
    .eq("organization_id", organizationId)
    .eq("requisition_id", requisitionId)
    .maybeSingle();

  if (!application) return null;

  const candidate = Array.isArray(application.job_candidates)
    ? application.job_candidates[0]
    : application.job_candidates;
  if (!candidate) return null;

  const offerRow = Array.isArray(application.job_offers)
    ? application.job_offers[0]
    : application.job_offers;

  const { data: history } = await admin
    .from("job_application_stage_history")
    .select("id, from_stage, to_stage, notes, created_at, changed_by")
    .eq("application_id", applicationId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  return {
    application: {
      id: application.id,
      stage: application.stage,
      employee_id: application.employee_id,
      applied_at: application.applied_at,
      stage_updated_at: application.stage_updated_at,
      requisition_id: application.requisition_id,
    },
    candidate: {
      full_name: candidate.full_name,
      email: candidate.email,
      phone: candidate.phone,
      source: candidate.source,
    },
    offer: offerRow
      ? {
          id: offerRow.id,
          status: offerRow.status,
          job_title: offerRow.job_title,
          basic_salary: offerRow.basic_salary,
          start_date: offerRow.start_date,
          generated_file_id: offerRow.generated_file_id ?? null,
        }
      : null,
    history: history ?? [],
    requisition: {
      id: requisition.id,
      title: requisition.title,
      status: requisition.status as RequisitionStatus,
    },
  };
}
