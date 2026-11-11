import { sendAgreementToSignEmail } from "@hrms/platform";

import { requireOrganizationId } from "@/lib/auth/organization-context";
import {
  assertDocumentUpload,
  fetchOrganizationFileBytes,
  getSignedDownloadUrl,
  hardDeleteOrganizationFile,
  uploadOrganizationFile,
} from "@/lib/files/storage";
import { sanitizeLetterHtml } from "@/lib/letters/html-text";
import { resolveLetterheadBytes } from "@/lib/letters/letterhead";
import { renderLetterPdf } from "@/lib/letters/render-pdf";
import { currencyOrDefault } from "@/lib/money";
import { createAdminClient } from "@/lib/supabase/admin";

import {
  assertCanEditAgreementBody,
  canCandidateRespondOfferStatus,
  canSendAgreement,
} from "./offer-status";
import {
  OFFER_TOKEN_TTL_DAYS,
  consumeOfferToken,
  createOfferToken,
  verifyOfferToken,
  type OfferTokenCheck,
  type OfferTokenPurpose,
  type OfferTokenRow,
} from "./offer-tokens";
import {
  buildOfferMergeValues,
  describeEmailFailure,
  loadApplicationLetterContext,
  moveApplicationStage,
} from "./offers";

type TokenFailure = Extract<OfferTokenCheck, { ok: false }>["reason"];

export type OfferPublicSummary = {
  organizationName: string;
  candidateName: string;
  jobTitle: string;
  startDate: string;
  currencyCode: string;
  basicSalary: number;
  offerStatus: string;
  hasOfferPdf: boolean;
  hasAgreementPdf: boolean;
  hasSigned: boolean;
};

export type OfferPublicContext =
  | { state: "ok"; summary: OfferPublicSummary }
  | { state: TokenFailure | "unavailable" };

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

type LoadedOffer = {
  id: string;
  status: string;
  jobTitle: string;
  basicSalary: number;
  startDate: string;
  generatedFileId: string | null;
  agreementFileId: string | null;
  signedFileId: string | null;
  applicationId: string;
  applicationStage: string;
  candidateName: string;
  candidateEmail: string;
  requisitionTitle: string;
  organizationName: string;
  currencyCode: "MYR" | "AUD";
  agreementBody: string | null;
  agreementSentAt: string | null;
};

async function loadOffer(organizationId: string, offerId: string): Promise<LoadedOffer | null> {
  const admin = createAdminClient();
  const { data: offer } = await admin
    .from("job_offers")
    .select(
      "id, status, job_title, basic_salary, start_date, generated_file_id, agreement_file_id, agreement_body, agreement_sent_at, signed_file_id, application_id, job_applications(stage, job_candidates(full_name, email), job_requisitions(title))",
    )
    .eq("id", offerId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!offer) return null;

  const application = pickOne(offer.job_applications);
  const candidate = pickOne(application?.job_candidates);
  const requisition = pickOne(application?.job_requisitions);

  const { data: organization } = await admin
    .from("organizations")
    .select("name, currency")
    .eq("id", organizationId)
    .maybeSingle();

  return {
    id: offer.id,
    status: offer.status as string,
    jobTitle: offer.job_title,
    basicSalary: Number(offer.basic_salary),
    startDate: offer.start_date,
    generatedFileId: offer.generated_file_id ?? null,
    agreementFileId: (offer.agreement_file_id as string | null) ?? null,
    signedFileId: offer.signed_file_id ?? null,
    applicationId: offer.application_id,
    applicationStage: (application?.stage as string | undefined) ?? "",
    candidateName: candidate?.full_name ?? "Candidate",
    candidateEmail: candidate?.email ?? "",
    requisitionTitle: requisition?.title ?? "",
    organizationName: organization?.name ?? "Your employer",
    currencyCode: currencyOrDefault(organization?.currency),
    agreementBody: (offer.agreement_body as string | null | undefined) ?? null,
    agreementSentAt: (offer.agreement_sent_at as string | null | undefined) ?? null,
  };
}

function summarize(offer: LoadedOffer): OfferPublicSummary {
  return {
    organizationName: offer.organizationName,
    candidateName: offer.candidateName,
    jobTitle: offer.jobTitle,
    startDate: offer.startDate,
    currencyCode: offer.currencyCode,
    basicSalary: offer.basicSalary,
    offerStatus: offer.status,
    hasOfferPdf: Boolean(offer.generatedFileId),
    hasAgreementPdf: Boolean(offer.agreementFileId),
    hasSigned: Boolean(offer.signedFileId),
  };
}

async function loadPublicContext(
  rawToken: string,
  purpose: OfferTokenPurpose,
  isAvailable: (offer: LoadedOffer) => boolean,
): Promise<OfferPublicContext> {
  const check = await verifyOfferToken(rawToken, purpose);
  if (!check.ok) return { state: check.reason };
  const offer = await loadOffer(check.token.organization_id, check.token.offer_id);
  if (!offer || !isAvailable(offer)) return { state: "unavailable" };
  return { state: "ok", summary: summarize(offer) };
}

function respondAvailable(offer: LoadedOffer): boolean {
  return canCandidateRespondOfferStatus(offer.status) && offer.applicationStage === "offer";
}

function signAvailable(offer: LoadedOffer): boolean {
  return offer.status === "accepted" && !offer.signedFileId && offer.applicationStage === "offer";
}

export function getOfferRespondContext(rawToken: string): Promise<OfferPublicContext> {
  return loadPublicContext(rawToken, "respond", respondAvailable);
}

export function getOfferSignContext(rawToken: string): Promise<OfferPublicContext> {
  return loadPublicContext(rawToken, "sign", signAvailable);
}

/** File a public token holder may download (offer letter on respond link, agreement on sign link). */
export async function resolveOfferTokenDownloadUrl(
  rawToken: string,
  purpose: OfferTokenPurpose,
): Promise<string | null> {
  const check = await verifyOfferToken(rawToken, purpose);
  if (!check.ok) return null;
  const offer = await loadOffer(check.token.organization_id, check.token.offer_id);
  if (!offer) return null;
  const fileId = purpose === "respond" ? offer.generatedFileId : offer.agreementFileId;
  return fileId ? getSignedDownloadUrl(fileId) : null;
}

const TOKEN_MESSAGES: Record<TokenFailure, string> = {
  invalid: "This link is not valid.",
  expired: "This link has expired. Please ask the hiring team to send a new one.",
  used: "This link has already been used.",
};

async function requireValidToken(rawToken: string, purpose: OfferTokenPurpose): Promise<OfferTokenRow> {
  const check = await verifyOfferToken(rawToken, purpose);
  if (!check.ok) throw new Error(TOKEN_MESSAGES[check.reason]);
  return check.token;
}

export async function candidateRejectOffer(rawToken: string): Promise<void> {
  const token = await requireValidToken(rawToken, "respond");
  const organizationId = token.organization_id;
  const offer = await loadOffer(organizationId, token.offer_id);
  if (!offer || !respondAvailable(offer)) {
    throw new Error("This offer is no longer open for a response.");
  }

  const admin = createAdminClient();
  const { data: updated, error } = await admin
    .from("job_offers")
    .update({ status: "declined" })
    .eq("id", offer.id)
    .eq("status", "sent")
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!updated) throw new Error("This offer is no longer open for a response.");

  await consumeOfferToken(token.id);

  await moveApplicationStage({
    applicationId: offer.applicationId,
    toStage: "rejected",
    actorUserId: null,
    organizationId,
    notes: "Offer declined by candidate.",
  });
}

export type AgreementEmailResult = {
  emailSent: boolean;
  /** True when no active employment agreement template exists. */
  agreementMissing?: boolean;
  warning?: string;
  devLink?: string;
};

async function loadActiveAgreementTemplate(organizationId: string): Promise<{
  body: string;
  letterheadFileId: string | null;
} | null> {
  const admin = createAdminClient();
  const { data: template } = await admin
    .from("hr_letter_templates")
    .select("body, letterhead_file_id")
    .eq("organization_id", organizationId)
    .eq("type", "employment_agreement")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!template) return null;
  return {
    body: template.body as string,
    letterheadFileId: (template.letterhead_file_id as string | null) ?? null,
  };
}

/** Save agreement body before first send. Does not email. */
export async function updateAgreementBody(
  offerId: string,
  agreementBody: string,
): Promise<void> {
  const organizationId = await requireOrganizationId();
  const offer = await loadOffer(organizationId, offerId);
  if (!offer) throw new Error("Offer not found.");
  assertCanEditAgreementBody({
    status: offer.status,
    agreement_sent_at: offer.agreementSentAt,
    signed_file_id: offer.signedFileId,
  });

  const body = sanitizeLetterHtml(agreementBody);
  const admin = createAdminClient();
  const { error } = await admin
    .from("job_offers")
    .update({ agreement_body: body })
    .eq("id", offerId)
    .eq("organization_id", organizationId);
  if (error) throw new Error(error.message);
}

/**
 * Generate agreement PDF from stored agreement_body (or regenerate after send from locked body),
 * email the sign link, and set agreement_sent_at on first successful send path.
 */
async function sendAgreementForAcceptedOffer(
  organizationId: string,
  offerId: string,
  actorUserId: string | null,
  options?: { regenerate?: boolean },
): Promise<AgreementEmailResult> {
  const admin = createAdminClient();
  const offer = await loadOffer(organizationId, offerId);
  if (!offer) throw new Error("Offer not found.");
  if (!canSendAgreement({ status: offer.status, signed_file_id: offer.signedFileId })) {
    throw new Error("The agreement can only be sent after the offer is accepted and before it is signed.");
  }
  if (!offer.candidateEmail) return { emailSent: false, warning: "Candidate has no email address." };

  let agreementBody = offer.agreementBody;
  if (!agreementBody?.trim()) {
    const template = await loadActiveAgreementTemplate(organizationId);
    if (!template) {
      return {
        emailSent: false,
        agreementMissing: true,
        warning:
          "No active employment agreement template. Create one under Letters, then send the agreement.",
      };
    }
    agreementBody = template.body;
    await admin
      .from("job_offers")
      .update({ agreement_body: sanitizeLetterHtml(agreementBody) })
      .eq("id", offerId);
  }

  const alreadySent = Boolean(offer.agreementSentAt);
  const regenerate = Boolean(options?.regenerate) || !alreadySent || !offer.agreementFileId;

  let bytes: Uint8Array | null = null;
  let agreementFileId = offer.agreementFileId;

  if (regenerate || !agreementFileId) {
    const template = await loadActiveAgreementTemplate(organizationId);
    const letterhead = await resolveLetterheadBytes({
      organizationId,
      templateLetterheadFileId: template?.letterheadFileId ?? null,
    });
    const letterContext = await loadApplicationLetterContext(organizationId, offer.applicationId);
    bytes = await renderLetterPdf(
      agreementBody,
      buildOfferMergeValues({
        candidateName: offer.candidateName,
        candidateEmail: offer.candidateEmail,
        jobTitle: offer.jobTitle,
        basicSalary: offer.basicSalary,
        currencyCode: offer.currencyCode,
        startDate: offer.startDate,
        organizationName: offer.organizationName,
        requisitionTitle: offer.requisitionTitle,
        department: letterContext.department,
        employmentType: letterContext.employmentType,
        workLocation: letterContext.workLocation,
        companyEmail: letterContext.companyEmail,
        companyPhone: letterContext.companyPhone,
      }),
      letterhead,
    );
    agreementFileId = await uploadOrganizationFile({
      organizationId,
      category: "recruitment_agreement",
      fileName: `agreement-${offer.applicationId}-${Date.now()}.pdf`,
      contentType: "application/pdf",
      body: bytes,
      uploadedByUserId: actorUserId,
    });
    const previousFileId = offer.agreementFileId;
    const { error } = await admin
      .from("job_offers")
      .update({
        agreement_file_id: agreementFileId,
        agreement_body: sanitizeLetterHtml(agreementBody),
      })
      .eq("id", offerId);
    if (error) {
      await hardDeleteUploaded(agreementFileId);
      throw new Error(error.message);
    }
    if (previousFileId && previousFileId !== agreementFileId) {
      await hardDeleteUploaded(previousFileId);
    }
  } else {
    bytes = await fetchOrganizationFileBytes(agreementFileId);
  }

  const { token } = await createOfferToken({ organizationId, offerId, purpose: "sign" });
  const signPath = `/offer/sign/${token}`;

  const result = await sendAgreementToSignEmail({
    to: offer.candidateEmail,
    candidateName: offer.candidateName,
    organizationName: offer.organizationName,
    jobTitle: offer.jobTitle,
    signPath,
    expiresInDays: OFFER_TOKEN_TTL_DAYS,
    attachment: bytes
      ? { filename: "employment-agreement.pdf", content: Buffer.from(bytes).toString("base64") }
      : undefined,
  });

  if (result.sent) {
    if (!alreadySent) {
      await admin
        .from("job_offers")
        .update({ agreement_sent_at: new Date().toISOString() })
        .eq("id", offerId);
    }
    return { emailSent: true };
  }
  return {
    emailSent: false,
    warning: describeEmailFailure(result),
    devLink:
      result.reason === "not_configured" && process.env.NODE_ENV !== "production" ? signPath : undefined,
  };
}

async function hardDeleteUploaded(fileId: string): Promise<void> {
  await hardDeleteOrganizationFile(fileId).catch(() => undefined);
}

/**
 * Candidate accept: mark accepted and snapshot agreement body from the active template.
 * Does not email — HR reviews/edits then sends the agreement from the candidate page.
 */
export async function candidateAcceptOffer(rawToken: string): Promise<AgreementEmailResult> {
  const token = await requireValidToken(rawToken, "respond");
  const organizationId = token.organization_id;
  const offer = await loadOffer(organizationId, token.offer_id);
  if (!offer || !respondAvailable(offer)) {
    throw new Error("This offer is no longer open for a response.");
  }

  const admin = createAdminClient();
  const template = await loadActiveAgreementTemplate(organizationId);
  const patch: Record<string, unknown> = {
    status: "accepted",
    accepted_at: new Date().toISOString(),
  };
  if (template && !offer.agreementBody) {
    patch.agreement_body = sanitizeLetterHtml(template.body);
  }

  const { data: updated, error } = await admin
    .from("job_offers")
    .update(patch)
    .eq("id", offer.id)
    .eq("status", "sent")
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!updated) throw new Error("This offer is no longer open for a response.");

  await consumeOfferToken(token.id);

  await admin.from("job_application_stage_history").insert({
    organization_id: organizationId,
    application_id: offer.applicationId,
    from_stage: "offer",
    to_stage: "offer",
    changed_by: null,
    notes: template
      ? "Offer accepted by candidate — HR to review and send agreement."
      : "Offer accepted by candidate — no agreement template yet; HR must add one before sending.",
  });

  return {
    emailSent: false,
    agreementMissing: !template,
    warning: template
      ? undefined
      : "No active employment agreement template. HR will prepare the agreement separately.",
  };
}

/** HR path: generate/email the agreement + a fresh upload link. */
export async function resendAgreementEmail(offerId: string, actorUserId: string): Promise<AgreementEmailResult> {
  const organizationId = await requireOrganizationId();
  return sendAgreementForAcceptedOffer(organizationId, offerId, actorUserId, { regenerate: false });
}

/** First send after accept (or force regenerate PDF from current agreement_body). */
export async function sendAgreementEmail(
  offerId: string,
  actorUserId: string,
): Promise<AgreementEmailResult> {
  const organizationId = await requireOrganizationId();
  return sendAgreementForAcceptedOffer(organizationId, offerId, actorUserId, { regenerate: true });
}

function contentTypeFor(file: { name: string; type: string }): string {
  if (file.type) return file.type;
  const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase() : "";
  switch (ext) {
    case ".pdf":
      return "application/pdf";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".doc":
      return "application/msword";
    default:
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
}

export async function submitSignedAgreement(rawToken: string, file: File): Promise<void> {
  const token = await requireValidToken(rawToken, "sign");
  const organizationId = token.organization_id;
  const offer = await loadOffer(organizationId, token.offer_id);
  if (!offer || !signAvailable(offer)) {
    throw new Error("This agreement is no longer open for upload.");
  }

  if (!file || file.size === 0) throw new Error("Choose a signed file to upload.");
  assertDocumentUpload({ name: file.name, type: file.type, size: file.size });

  const extension = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase() : ".pdf";
  const fileId = await uploadOrganizationFile({
    organizationId,
    category: "recruitment_signed_offer",
    fileName: `signed-agreement-${offer.applicationId}-${Date.now()}${extension}`,
    contentType: contentTypeFor(file),
    body: new Uint8Array(await file.arrayBuffer()),
    uploadedByUserId: null,
  });

  const admin = createAdminClient();
  const { data: updated, error } = await admin
    .from("job_offers")
    .update({ signed_file_id: fileId })
    .eq("id", offer.id)
    .eq("status", "accepted")
    .is("signed_file_id", null)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!updated) throw new Error("This agreement is no longer open for upload.");

  await consumeOfferToken(token.id);

  await admin.from("job_application_stage_history").insert({
    organization_id: organizationId,
    application_id: offer.applicationId,
    from_stage: "offer",
    to_stage: "offer",
    changed_by: null,
    notes: "Signed agreement uploaded by candidate — ready for HR to confirm hire.",
  });
}
