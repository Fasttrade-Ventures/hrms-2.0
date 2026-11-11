export type OfferStatus = "draft" | "sent" | "accepted" | "declined" | "withdrawn";

export function canAcceptOfferStatus(status: string): boolean {
  return status === "draft" || status === "sent";
}

export function canTransitionOfferStatus(from: OfferStatus, to: OfferStatus): boolean {
  if (from === to) return false;
  if (from === "accepted" || from === "declined" || from === "withdrawn") return false;
  if (to === "sent") return from === "draft";
  if (to === "declined" || to === "withdrawn") return from === "draft" || from === "sent";
  return false;
}

/** Candidate (token) decisions are only valid while the offer is out for response. */
export function canCandidateRespondOfferStatus(status: string): boolean {
  return status === "sent";
}

/**
 * HR "Confirm hire" gate: the candidate must have accepted and uploaded a signed file.
 * Throws a user-facing message when the gate is not satisfied.
 */
export function assertCanConfirmHire(offer: { status: string; signed_file_id: string | null }): void {
  if (offer.status !== "accepted") {
    throw new Error(`Cannot confirm hire while the offer is ${offer.status}. The candidate must accept first.`);
  }
  if (!offer.signed_file_id) {
    throw new Error("Cannot confirm hire until the candidate uploads the signed agreement.");
  }
}

export function canConfirmHire(offer: { status: string; signed_file_id: string | null }): boolean {
  return offer.status === "accepted" && Boolean(offer.signed_file_id);
}

/** Recruiter may edit the offer letter only while the offer is still a draft. */
export function canEditOfferLetter(offer: { status: string }): boolean {
  return offer.status === "draft";
}

/**
 * Recruiter may edit the agreement body after accept, before the agreement email is sent
 * and before a signed file arrives.
 */
export function canEditAgreementBody(offer: {
  status: string;
  agreement_sent_at: string | null;
  signed_file_id: string | null;
}): boolean {
  return offer.status === "accepted" && !offer.agreement_sent_at && !offer.signed_file_id;
}

/** HR may (re)send the agreement while accepted, unsigned. */
export function canSendAgreement(offer: { status: string; signed_file_id: string | null }): boolean {
  return offer.status === "accepted" && !offer.signed_file_id;
}

export function assertCanEditOfferLetter(offer: { status: string }): void {
  if (!canEditOfferLetter(offer)) {
    throw new Error("The offer letter can only be edited while the offer is a draft.");
  }
}

export function assertCanEditAgreementBody(offer: {
  status: string;
  agreement_sent_at: string | null;
  signed_file_id: string | null;
}): void {
  if (!canEditAgreementBody(offer)) {
    throw new Error("The agreement can only be edited after accept and before it is sent.");
  }
}

export type OfferFlowStepKey = "sent" | "responded" | "signed" | "hired";

export type OfferFlowStep = {
  key: OfferFlowStepKey;
  label: string;
  state: "done" | "current" | "upcoming";
};

export type OfferFlowSummary = {
  /** Short status label for the primary chip. */
  headline: string;
  tone: "neutral" | "pending" | "success" | "danger";
  steps: OfferFlowStep[];
};

/** Derives the candidate-facing progress strip from offer + application state. */
export function summarizeOfferFlow(input: {
  status: string;
  agreementFileId: string | null;
  agreementSentAt?: string | null;
  signedFileId: string | null;
  applicationStage: string;
}): OfferFlowSummary {
  const hired = input.applicationStage === "hired";
  const accepted = input.status === "accepted";
  const sentOrBeyond = input.status === "sent" || accepted;
  const signed = Boolean(input.signedFileId);
  const agreementSent = Boolean(input.agreementSentAt ?? input.agreementFileId);

  let headline = "Draft";
  let tone: OfferFlowSummary["tone"] = "neutral";
  if (input.status === "declined") {
    headline = "Declined";
    tone = "danger";
  } else if (input.status === "withdrawn") {
    headline = "Withdrawn";
    tone = "danger";
  } else if (hired) {
    headline = "Hired";
    tone = "success";
  } else if (accepted && signed) {
    headline = "Signed";
    tone = "success";
  } else if (accepted && agreementSent) {
    headline = "Awaiting signature";
    tone = "pending";
  } else if (accepted) {
    headline = "Prepare agreement";
    tone = "pending";
  } else if (input.status === "sent") {
    headline = "Awaiting response";
    tone = "pending";
  }

  const done = [sentOrBeyond, accepted, accepted && signed, hired] as const;
  const labels: Array<[OfferFlowStepKey, string]> = [
    ["sent", "Sent"],
    ["responded", "Accepted"],
    ["signed", "Signed"],
    ["hired", "Hired"],
  ];
  const firstOpen = done.findIndex((value) => !value);
  const steps = labels.map(([key, label], index): OfferFlowStep => ({
    key,
    label,
    state: done[index] ? "done" : index === firstOpen ? "current" : "upcoming",
  }));

  return { headline, tone, steps };
}
