import { emitRecruitmentWebhook } from "@/lib/integrations/webhooks/emit";
import { uploadOrganizationFile } from "@/lib/files/storage";
import { buildOfferPdf } from "@/lib/recruitment/offer-pdf";
import { createAdminClient } from "@/lib/supabase/admin";
import { getNextEmployeeNumber } from "@/lib/employees/organization";

import type { RecruitmentStage } from "./types";
import { canMoveToStage } from "./types";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export async function moveApplicationStage(input: {
  applicationId: string;
  toStage: RecruitmentStage;
  actorUserId: string;
  notes?: string;
}): Promise<void> {
  const admin = createAdminClient();
  const organizationId = getOrganizationId();

  const { data: application } = await admin
    .from("job_applications")
    .select("id, stage, requisition_id")
    .eq("id", input.applicationId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!application) throw new Error("Application not found.");
  const fromStage = application.stage as RecruitmentStage;
  if (!canMoveToStage(fromStage, input.toStage)) {
    throw new Error(`Cannot move from ${fromStage} to ${input.toStage}.`);
  }

  const { error } = await admin
    .from("job_applications")
    .update({ stage: input.toStage, stage_updated_at: new Date().toISOString() })
    .eq("id", input.applicationId);

  if (error) throw new Error(error.message);

  await admin.from("job_application_stage_history").insert({
    organization_id: organizationId,
    application_id: input.applicationId,
    from_stage: fromStage,
    to_stage: input.toStage,
    changed_by: input.actorUserId,
    notes: input.notes ?? null,
  });
}

export async function acceptOffer(offerId: string, actorUserId: string): Promise<{ employeeId: string }> {
  const admin = createAdminClient();
  const organizationId = getOrganizationId();

  const { data: offer } = await admin
    .from("job_offers")
    .select(
      "id, application_id, job_title, basic_salary, start_date, job_applications(candidate_id, requisition_id, job_candidates(full_name, email, phone), job_requisitions(branch_id, department_id))",
    )
    .eq("id", offerId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!offer) throw new Error("Offer not found.");

  const application = Array.isArray(offer.job_applications) ? offer.job_applications[0] : offer.job_applications;
  const candidate = Array.isArray(application?.job_candidates)
    ? application.job_candidates[0]
    : application?.job_candidates;
  const requisition = Array.isArray(application?.job_requisitions)
    ? application.job_requisitions[0]
    : application?.job_requisitions;

  if (!candidate || !application) throw new Error("Candidate not found.");

  const employeeNumber = await getNextEmployeeNumber(organizationId);
  const { data: employee, error: employeeError } = await admin
    .from("employees")
    .insert({
      organization_id: organizationId,
      employee_number: employeeNumber,
      full_name: candidate.full_name,
      email: candidate.email,
      branch_id: requisition?.branch_id ?? null,
      department_id: requisition?.department_id ?? null,
      job_title: offer.job_title,
      status: "draft",
      join_date: offer.start_date,
    })
    .select("id")
    .single();

  if (employeeError || !employee) throw new Error(employeeError?.message ?? "Failed to create draft employee.");

  await admin.from("employee_profiles").insert({
    organization_id: organizationId,
    employee_id: employee.id,
    phone: candidate.phone ?? null,
    basic_salary: offer.basic_salary,
  });

  await admin
    .from("job_offers")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", offerId);

  await admin
    .from("job_applications")
    .update({
      stage: "hired",
      employee_id: employee.id,
      stage_updated_at: new Date().toISOString(),
    })
    .eq("id", offer.application_id);

  await admin.from("job_application_stage_history").insert({
    organization_id: organizationId,
    application_id: offer.application_id,
    from_stage: "offer",
    to_stage: "hired",
    changed_by: actorUserId,
    notes: "Offer accepted — draft employee created.",
  });

  await emitRecruitmentWebhook(
    organizationId,
    "recruitment.offer_accepted",
    { offerId, applicationId: offer.application_id, employeeId: employee.id },
    `offer-accepted:${offerId}`,
  );

  return { employeeId: employee.id };
}

export async function createOfferForApplication(input: {
  applicationId: string;
  jobTitle: string;
  basicSalary: number;
  startDate: string;
  organizationName: string;
  actorUserId: string;
}): Promise<{ offerId: string }> {
  const admin = createAdminClient();
  const organizationId = getOrganizationId();

  const { data: application } = await admin
    .from("job_applications")
    .select("id, job_candidates(full_name)")
    .eq("id", input.applicationId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!application) throw new Error("Application not found.");
  const candidate = Array.isArray(application.job_candidates)
    ? application.job_candidates[0]
    : application.job_candidates;

  const pdfBytes = buildOfferPdf({
    organizationName: input.organizationName,
    candidateName: candidate?.full_name ?? "Candidate",
    jobTitle: input.jobTitle,
    basicSalary: input.basicSalary,
    startDate: input.startDate,
  });

  const fileId = await uploadOrganizationFile({
    organizationId,
    category: "recruitment_offer",
    fileName: `offer-${input.applicationId}.pdf`,
    contentType: "application/pdf",
    body: pdfBytes,
    uploadedByUserId: input.actorUserId,
  });

  const { data: offer, error } = await admin
    .from("job_offers")
    .upsert(
      {
        organization_id: organizationId,
        application_id: input.applicationId,
        job_title: input.jobTitle,
        basic_salary: input.basicSalary,
        start_date: input.startDate,
        status: "draft",
        generated_file_id: fileId,
      },
      { onConflict: "application_id" },
    )
    .select("id")
    .single();

  if (error || !offer) throw new Error(error?.message ?? "Failed to create offer.");

  await admin
    .from("job_applications")
    .update({ stage: "offer", stage_updated_at: new Date().toISOString() })
    .eq("id", input.applicationId);

  return { offerId: offer.id };
}
