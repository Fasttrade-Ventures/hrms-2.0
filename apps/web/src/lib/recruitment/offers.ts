import { emitRecruitmentWebhook } from "@/lib/integrations/webhooks/emit";
import { sendOfferSentEmail } from "@hrms/platform";

import { fetchOrganizationFileBytes, hardDeleteOrganizationFile, uploadOrganizationFile } from "@/lib/files/storage";
import { getLetterTemplate } from "@/lib/letters/templates";
import type { LetterMergeValues } from "@/lib/letters/merge-tags";
import { sanitizeLetterHtml } from "@/lib/letters/html-text";
import { resolveLetterheadBytes } from "@/lib/letters/letterhead";
import { renderLetterPdf } from "@/lib/letters/render-pdf";
import { OFFER_TOKEN_TTL_DAYS, createOfferToken } from "@/lib/recruitment/offer-tokens";
import { createAdminClient } from "@/lib/supabase/admin";
import { getNextEmployeeNumber } from "@/lib/employees/organization";

import {
  onboardingChecklistSkipMessage,
  tryStartOnboardingChecklist,
} from "@/lib/employees/start-onboarding-checklist";
import {
  assertCanConfirmHire,
  assertCanEditOfferLetter,
  canTransitionOfferStatus,
  type OfferStatus,
} from "@/lib/recruitment/offer-status";
import type { RecruitmentStage } from "./types";
import { canMoveToStage } from "./types";
import { requireOrganizationId } from "@/lib/auth/organization-context";


export async function moveApplicationStage(input: {
  applicationId: string;
  toStage: RecruitmentStage;
  /** Null for candidate-driven (token) changes. */
  actorUserId: string | null;
  notes?: string;
  /** Pass for public/token flows that have no HR session. */
  organizationId?: string;
}): Promise<void> {
  const admin = createAdminClient();
  const organizationId = input.organizationId ?? (await requireOrganizationId());

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

export type OfferEmailResult = {
  emailSent: boolean;
  warning?: string;
  /** Local-only convenience when email isn't configured (never in production). */
  devLink?: string;
};

export function describeEmailFailure(
  result: { sent: false; reason: "not_configured" | "request_failed"; detail?: string },
): string {
  if (result.reason === "not_configured") {
    return "Email is not configured (set RESEND_API_KEY and MAIL_FROM).";
  }
  return `The email provider rejected the message${result.detail ? `: ${result.detail.slice(0, 200)}` : "."}`;
}

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

/** Renders a template body to PDF and stores it. Returns the new file id. */
async function renderAndStoreLetter(input: {
  organizationId: string;
  category: string;
  fileName: string;
  body: string;
  values: LetterMergeValues;
  actorUserId: string | null;
  /** Template-level letterhead override; falls back to the organization default. */
  templateLetterheadFileId?: string | null;
}): Promise<{ fileId: string; bytes: Uint8Array }> {
  const letterhead = await resolveLetterheadBytes({
    organizationId: input.organizationId,
    templateLetterheadFileId: input.templateLetterheadFileId,
  });
  const bytes = await renderLetterPdf(input.body, input.values, letterhead);
  const fileId = await uploadOrganizationFile({
    organizationId: input.organizationId,
    category: input.category,
    fileName: input.fileName,
    contentType: "application/pdf",
    body: bytes,
    uploadedByUserId: input.actorUserId,
  });
  return { fileId, bytes };
}

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: "Full time",
  part_time: "Part time",
  contract: "Contract",
  intern: "Intern",
};

/** Human label for requisition employment_type codes; custom values pass through. */
export function formatEmploymentTypeLabel(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  const key = value.trim().toLowerCase();
  return EMPLOYMENT_TYPE_LABELS[key] ?? value.trim();
}

/** Offer letter date in Malaysia locale (e.g. 11 November 2026). */
export function formatOfferDate(date: Date = new Date()): string {
  return date.toLocaleDateString("en-MY", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kuala_Lumpur",
  });
}

export function buildOfferMergeValues(input: {
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  basicSalary: number;
  currencyCode: string;
  startDate: string;
  organizationName: string;
  requisitionTitle: string;
  offerDate?: string | null;
  department?: string | null;
  employmentType?: string | null;
  workLocation?: string | null;
  companyEmail?: string | null;
  companyPhone?: string | null;
}): LetterMergeValues {
  return {
    candidate_name: input.candidateName,
    candidate_email: input.candidateEmail,
    job_title: input.jobTitle,
    salary: input.basicSalary,
    currency: input.currencyCode,
    start_date: input.startDate,
    organization_name: input.organizationName,
    requisition_title: input.requisitionTitle,
    offer_date: input.offerDate?.trim() || formatOfferDate(),
    department: input.department?.trim() || "",
    employment_type: formatEmploymentTypeLabel(input.employmentType),
    work_location: input.workLocation?.trim() || "",
    company_email: input.companyEmail?.trim() || "",
    company_phone: input.companyPhone?.trim() || "",
  };
}

/** Confirm hire: HR creates the draft employee after the candidate accepted and uploaded the signed file. */
export async function confirmHire(
  offerId: string,
  actorUserId: string,
): Promise<{ employeeId: string; checklistStarted: boolean; checklistMessage?: string }> {
  const admin = createAdminClient();
  const organizationId = await requireOrganizationId();

  const { data: offer } = await admin
    .from("job_offers")
    .select(
      "id, status, signed_file_id, application_id, job_title, basic_salary, start_date, job_applications(employee_id, candidate_id, requisition_id, job_candidates(full_name, email, phone), job_requisitions(branch_id, department_id))",
    )
    .eq("id", offerId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!offer) throw new Error("Offer not found.");

  assertCanConfirmHire({
    status: offer.status as string,
    signed_file_id: (offer.signed_file_id as string | null) ?? null,
  });

  const application = pickOne(offer.job_applications);
  const candidate = pickOne(application?.job_candidates);
  const requisition = pickOne(application?.job_requisitions);

  if (!candidate || !application) throw new Error("Candidate not found.");
  if (application.employee_id) throw new Error("This candidate has already been hired.");

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
    notes: "Hire confirmed — signed agreement received, draft employee created.",
  });

  await emitRecruitmentWebhook(
    organizationId,
    "recruitment.offer_accepted",
    { offerId, applicationId: offer.application_id, employeeId: employee.id },
    `offer-accepted:${offerId}`,
  );

  let checklistStarted = false;
  let checklistMessage: string | undefined;
  try {
    const checklist = await tryStartOnboardingChecklist(organizationId, employee.id);
    checklistStarted = checklist.started;
    if (!checklist.started && checklist.reason) {
      checklistMessage = onboardingChecklistSkipMessage(checklist.reason);
    }
  } catch {
    checklistMessage = "Onboarding checklist could not be started automatically.";
  }

  return { employeeId: employee.id, checklistStarted, checklistMessage };
}

type OfferWriteInput = {
  jobTitle: string;
  basicSalary: number;
  startDate: string;
  templateId: string;
  letterBody: string;
  organizationName: string;
  currencyCode: string;
  actorUserId: string;
};

async function loadOfferTemplate(templateId: string) {
  const template = await getLetterTemplate(templateId);
  if (!template) throw new Error("Offer template not found.");
  if (template.type !== "offer") throw new Error("Choose an offer template.");
  if (!template.is_active) throw new Error("That offer template is inactive.");
  return template;
}

export type OfferLetterContext = {
  stage: RecruitmentStage;
  candidateName: string;
  candidateEmail: string;
  requisitionTitle: string;
  department: string;
  employmentType: string;
  workLocation: string;
  companyEmail: string;
  companyPhone: string;
  organizationName: string;
};

/** Candidate + requisition + org contact fields used when merging letter templates. */
export async function loadApplicationLetterContext(
  organizationId: string,
  applicationId: string,
): Promise<OfferLetterContext> {
  const admin = createAdminClient();
  const { data: application } = await admin
    .from("job_applications")
    .select(
      "id, stage, job_candidates(full_name, email), job_requisitions(title, employment_type, departments(name), branches(name))",
    )
    .eq("id", applicationId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!application) throw new Error("Application not found.");
  const candidate = pickOne(application.job_candidates);
  const requisition = pickOne(application.job_requisitions);
  const department = pickOne(
    (requisition as { departments?: { name: string } | { name: string }[] | null } | null)?.departments,
  );
  const branch = pickOne(
    (requisition as { branches?: { name: string } | { name: string }[] | null } | null)?.branches,
  );

  const { data: organization } = await admin
    .from("organizations")
    .select("name, company_email, company_phone")
    .eq("id", organizationId)
    .maybeSingle();

  return {
    stage: application.stage as RecruitmentStage,
    candidateName: candidate?.full_name ?? "Candidate",
    candidateEmail: candidate?.email ?? "",
    requisitionTitle: (requisition as { title?: string } | null)?.title ?? "",
    department: department?.name ?? "",
    employmentType:
      ((requisition as { employment_type?: string | null } | null)?.employment_type as string | null) ?? "",
    workLocation: branch?.name ?? "",
    companyEmail: (organization?.company_email as string | null | undefined) ?? "",
    companyPhone: (organization?.company_phone as string | null | undefined) ?? "",
    organizationName: (organization?.name as string | null | undefined) ?? "Organization",
  };
}

export async function createOfferForApplication(
  input: OfferWriteInput & { applicationId: string },
): Promise<{ offerId: string }> {
  const admin = createAdminClient();
  const organizationId = await requireOrganizationId();

  const context = await loadApplicationLetterContext(organizationId, input.applicationId);
  const template = await loadOfferTemplate(input.templateId);
  const letterBody = sanitizeLetterHtml(input.letterBody);

  const { data: existing } = await admin
    .from("job_offers")
    .select("id, status")
    .eq("application_id", input.applicationId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (existing) {
    throw new Error(
      existing.status === "draft"
        ? "A draft offer already exists. Edit the draft instead."
        : `An offer already exists for this candidate (${existing.status}).`,
    );
  }

  const { fileId } = await renderAndStoreLetter({
    organizationId,
    category: "recruitment_offer",
    fileName: `offer-${input.applicationId}-${Date.now()}.pdf`,
    body: letterBody,
    templateLetterheadFileId: template.letterhead_file_id,
    values: buildOfferMergeValues({
      candidateName: context.candidateName,
      candidateEmail: context.candidateEmail,
      jobTitle: input.jobTitle,
      basicSalary: input.basicSalary,
      currencyCode: input.currencyCode,
      startDate: input.startDate,
      organizationName: input.organizationName,
      requisitionTitle: context.requisitionTitle,
      department: context.department,
      employmentType: context.employmentType,
      workLocation: context.workLocation,
      companyEmail: context.companyEmail,
      companyPhone: context.companyPhone,
    }),
    actorUserId: input.actorUserId,
  });

  const { data: offer, error } = await admin
    .from("job_offers")
    .insert({
      organization_id: organizationId,
      application_id: input.applicationId,
      job_title: input.jobTitle,
      basic_salary: input.basicSalary,
      start_date: input.startDate,
      status: "draft",
      template_id: template.id,
      letter_body: letterBody,
      generated_file_id: fileId,
    })
    .select("id")
    .single();

  if (error || !offer) {
    await hardDeleteOrganizationFile(fileId).catch(() => undefined);
    throw new Error(error?.message ?? "Failed to create offer.");
  }

  if (context.stage !== "offer") {
    await admin
      .from("job_applications")
      .update({ stage: "offer", stage_updated_at: new Date().toISOString() })
      .eq("id", input.applicationId);

    await admin.from("job_application_stage_history").insert({
      organization_id: organizationId,
      application_id: input.applicationId,
      from_stage: context.stage,
      to_stage: "offer",
      changed_by: input.actorUserId,
      notes: "Offer created.",
    });
  }

  return { offerId: offer.id };
}

/** Edit a draft offer: re-merge the stored letter body and regenerate the PDF. Draft only. */
export async function updateDraftOffer(
  input: OfferWriteInput & { offerId: string },
): Promise<void> {
  const admin = createAdminClient();
  const organizationId = await requireOrganizationId();

  const { data: offer } = await admin
    .from("job_offers")
    .select("id, status, application_id, generated_file_id")
    .eq("id", input.offerId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!offer) throw new Error("Offer not found.");
  assertCanEditOfferLetter(offer);

  const context = await loadApplicationLetterContext(organizationId, offer.application_id);
  const template = await loadOfferTemplate(input.templateId);
  const letterBody = sanitizeLetterHtml(input.letterBody);

  const { fileId } = await renderAndStoreLetter({
    organizationId,
    category: "recruitment_offer",
    fileName: `offer-${offer.application_id}-${Date.now()}.pdf`,
    body: letterBody,
    templateLetterheadFileId: template.letterhead_file_id,
    values: buildOfferMergeValues({
      candidateName: context.candidateName,
      candidateEmail: context.candidateEmail,
      jobTitle: input.jobTitle,
      basicSalary: input.basicSalary,
      currencyCode: input.currencyCode,
      startDate: input.startDate,
      organizationName: input.organizationName,
      requisitionTitle: context.requisitionTitle,
      department: context.department,
      employmentType: context.employmentType,
      workLocation: context.workLocation,
      companyEmail: context.companyEmail,
      companyPhone: context.companyPhone,
    }),
    actorUserId: input.actorUserId,
  });

  const { data: updated, error } = await admin
    .from("job_offers")
    .update({
      job_title: input.jobTitle,
      basic_salary: input.basicSalary,
      start_date: input.startDate,
      template_id: template.id,
      letter_body: letterBody,
      generated_file_id: fileId,
    })
    .eq("id", input.offerId)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    await hardDeleteOrganizationFile(fileId).catch(() => undefined);
    throw new Error(error?.message ?? "Offer is no longer a draft.");
  }

  if (offer.generated_file_id) {
    await hardDeleteOrganizationFile(offer.generated_file_id).catch(() => undefined);
  }
}

async function transitionOfferStatus(
  offerId: string,
  toStatus: Extract<OfferStatus, "sent" | "declined" | "withdrawn">,
  actorUserId: string,
  applicationStage?: Extract<RecruitmentStage, "rejected" | "withdrawn">,
): Promise<void> {
  const admin = createAdminClient();
  const organizationId = await requireOrganizationId();

  const { data: offer } = await admin
    .from("job_offers")
    .select("id, status, application_id")
    .eq("id", offerId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!offer) throw new Error("Offer not found.");

  const fromStatus = offer.status as OfferStatus;
  if (!canTransitionOfferStatus(fromStatus, toStatus)) {
    throw new Error(`Cannot transition offer from ${fromStatus} to ${toStatus}.`);
  }

  const patch: { status: typeof toStatus; sent_at?: string } = { status: toStatus };
  if (toStatus === "sent") {
    patch.sent_at = new Date().toISOString();
  }

  const { error: offerError } = await admin.from("job_offers").update(patch).eq("id", offerId);
  if (offerError) throw new Error(offerError.message);

  if (applicationStage) {
    await moveApplicationStage({
      applicationId: offer.application_id,
      toStage: applicationStage,
      actorUserId,
      notes: applicationStage === "rejected" ? "Offer declined." : "Offer withdrawn.",
    });
  }
}

/** Creates a fresh respond token and emails the offer PDF with Accept / Reject links. */
async function deliverOfferEmail(organizationId: string, offerId: string): Promise<OfferEmailResult> {
  const admin = createAdminClient();

  const { data: offer } = await admin
    .from("job_offers")
    .select(
      "id, job_title, generated_file_id, job_applications(job_candidates(full_name, email))",
    )
    .eq("id", offerId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!offer) throw new Error("Offer not found.");

  const application = pickOne(offer.job_applications);
  const candidate = pickOne(application?.job_candidates);
  if (!candidate?.email) return { emailSent: false, warning: "Candidate has no email address." };

  const { data: organization } = await admin
    .from("organizations")
    .select("name")
    .eq("id", organizationId)
    .maybeSingle();

  const { token } = await createOfferToken({ organizationId, offerId, purpose: "respond" });
  const respondPath = `/offer/respond/${token}`;

  let attachment: { filename: string; content: string } | undefined;
  if (offer.generated_file_id) {
    const bytes = await fetchOrganizationFileBytes(offer.generated_file_id);
    if (!bytes) {
      return { emailSent: false, warning: "Could not read the offer PDF to attach it. Try Resend." };
    }
    attachment = { filename: "offer-letter.pdf", content: toBase64(bytes) };
  }

  let result;
  try {
    result = await sendOfferSentEmail({
      to: candidate.email,
      candidateName: candidate.full_name,
      organizationName: organization?.name ?? "Your employer",
      jobTitle: offer.job_title,
      acceptPath: `${respondPath}?decision=accept`,
      rejectPath: `${respondPath}?decision=reject`,
      expiresInDays: OFFER_TOKEN_TTL_DAYS,
      attachment,
    });
  } catch (error) {
    return {
      emailSent: false,
      warning: `Email failed: ${error instanceof Error ? error.message : "unknown error"}`,
    };
  }

  if (result.sent) return { emailSent: true };

  return {
    emailSent: false,
    warning: describeEmailFailure(result),
    devLink:
      result.reason === "not_configured" && process.env.NODE_ENV !== "production"
        ? respondPath
        : undefined,
  };
}

/** Mark sent: status moves to `sent` first; email is soft-fail with a Resend path. */
export async function markOfferSent(offerId: string, actorUserId: string): Promise<OfferEmailResult> {
  await transitionOfferStatus(offerId, "sent", actorUserId);
  const organizationId = await requireOrganizationId();
  try {
    return await deliverOfferEmail(organizationId, offerId);
  } catch (error) {
    return {
      emailSent: false,
      warning: `Email failed: ${error instanceof Error ? error.message : "unknown error"}`,
    };
  }
}

/** Resend the offer email (new respond link, old one invalidated). Only while status is `sent`. */
export async function resendOfferEmail(offerId: string): Promise<OfferEmailResult> {
  const admin = createAdminClient();
  const organizationId = await requireOrganizationId();

  const { data: offer } = await admin
    .from("job_offers")
    .select("id, status")
    .eq("id", offerId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!offer) throw new Error("Offer not found.");
  if (offer.status !== "sent") throw new Error("Only sent offers can be re-emailed.");

  return deliverOfferEmail(organizationId, offerId);
}

export async function declineOffer(offerId: string, actorUserId: string): Promise<void> {
  await transitionOfferStatus(offerId, "declined", actorUserId, "rejected");
}

export async function withdrawOffer(offerId: string, actorUserId: string): Promise<void> {
  await transitionOfferStatus(offerId, "withdrawn", actorUserId, "withdrawn");
}
