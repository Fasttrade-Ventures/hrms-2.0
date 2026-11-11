"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";

import {
  confirmHireAction,
  createOfferAction,
  moveStageAction,
  resendAgreementEmailAction,
  resendOfferEmailAction,
  sendAgreementEmailAction,
  setOfferStatusAction,
  updateAgreementBodyAction,
  updateDraftOfferAction,
  type RecruitmentActionState,
} from "@/app/(hr)/hr/recruitment/actions";
import { AnnouncementEditor } from "@/components/hr/announcements/announcement-editor";
import {
  HrField,
  HrFormMessage,
  HrGhostButton,
  HrPrimaryButton,
  HrSelect,
  HrTextarea,
  HrTextInput,
} from "@/components/hr/employees/form-fields";
import { HrLinkButton } from "@/components/hr/hr-ui.client";
import { HrBanner } from "@/components/hr/hr-ui";
import {
  canConfirmHire,
  canEditAgreementBody,
  canTransitionOfferStatus,
  summarizeOfferFlow,
  type OfferFlowSummary,
  type OfferStatus,
} from "@/lib/recruitment/offer-status";
import { Badge } from "@/components/ui/badge";
import type { ApplicationDetail } from "@/lib/recruitment/applications";
import { TERMINAL_STAGES, nextAdvanceStages, type RecruitmentStage } from "@/lib/recruitment/types";
import { PortalSectionCard } from "@/components/portal/portal-section";
import { looksLikeHtml, plainTextToHtml } from "@/lib/letters/html-text";
import { cn } from "@/lib/utils";

const initialState: RecruitmentActionState = {};

export type OfferTemplateOption = { id: string; name: string; body: string };

function formatStageLabel(stage: string): string {
  return stage.replaceAll("_", " ");
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function canCreateOffer(stage: RecruitmentStage, hasOffer: boolean, readOnly: boolean): boolean {
  if (readOnly || hasOffer) return false;
  return stage === "assessment" || stage === "offer";
}

function toEditorHtml(body: string): string {
  return looksLikeHtml(body) ? body : plainTextToHtml(body);
}

const TONE_BADGE: Record<OfferFlowSummary["tone"], "outline" | "warning" | "success" | "destructive"> = {
  neutral: "outline",
  pending: "warning",
  success: "success",
  danger: "destructive",
};

function OfferStatusStrip({ summary }: { summary: OfferFlowSummary }) {
  return (
    <ol aria-label="Offer progress" className="flex flex-wrap items-center gap-x-2 gap-y-2 text-xs">
      {summary.steps.map((step, index) => (
        <li className="flex items-center gap-2" key={step.key}>
          <span
            className={cn(
              "inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 font-medium",
              step.state === "done" && "border-emerald-500/30 bg-emerald-50 text-emerald-700",
              step.state === "current" && "border-amber-500/40 bg-amber-50 text-amber-700",
              step.state === "upcoming" && "border-border text-muted-foreground",
            )}
          >
            <span aria-hidden>{step.state === "done" ? "✓" : index + 1}</span>
            {step.label}
          </span>
          {index < summary.steps.length - 1 ? (
            <span aria-hidden className="text-muted-foreground">
              →
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function ActionNotices({ state }: { state: RecruitmentActionState }) {
  return (
    <>
      <HrFormMessage error={state.error} success={state.success} />
      {state.warning ? <HrBanner>{state.warning}</HrBanner> : null}
      {state.devLink ? (
        <p className="break-all text-xs text-muted-foreground">
          Email isn&apos;t configured. Local test link: <code>{state.devLink}</code>
        </p>
      ) : null}
    </>
  );
}

function LetterBodyField({
  idPrefix,
  label,
  name,
  value,
  onChange,
  editorKey,
  hint,
}: {
  idPrefix: string;
  label: string;
  name: string;
  value: string;
  onChange: (html: string) => void;
  editorKey: string;
  hint?: string;
}) {
  return (
    <HrField hint={hint} id={`${idPrefix}-body`} label={label}>
      <AnnouncementEditor defaultValue={value} key={editorKey} onChange={onChange} />
      <input name={name} type="hidden" value={value} />
    </HrField>
  );
}

function OfferFields({
  idPrefix,
  templates,
  defaults,
  letterBody,
  onLetterBodyChange,
  onTemplateChange,
}: {
  idPrefix: string;
  templates: OfferTemplateOption[];
  defaults: { jobTitle: string; basicSalary?: number; startDate?: string; templateId?: string | null };
  letterBody: string;
  onLetterBodyChange: (html: string) => void;
  onTemplateChange: (templateId: string) => void;
}) {
  const selectedTemplateId =
    defaults.templateId && templates.some((t) => t.id === defaults.templateId)
      ? defaults.templateId
      : (templates[0]?.id ?? "");

  return (
    <>
      <HrField
        hint="Changing the template replaces the letter body below with that template."
        id={`${idPrefix}-template`}
        label="Offer template"
      >
        <HrSelect
          id={`${idPrefix}-template`}
          name="templateId"
          onChange={(event) => onTemplateChange(event.target.value)}
          required
          value={selectedTemplateId}
        >
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </HrSelect>
      </HrField>
      <div className="grid gap-4 sm:grid-cols-3">
        <HrField id={`${idPrefix}-job-title`} label="Job title">
          <HrTextInput
            defaultValue={defaults.jobTitle}
            id={`${idPrefix}-job-title`}
            name="jobTitle"
            required
          />
        </HrField>
        <HrField id={`${idPrefix}-basic-salary`} label="Basic salary">
          <HrTextInput
            defaultValue={defaults.basicSalary}
            id={`${idPrefix}-basic-salary`}
            min={0}
            name="basicSalary"
            required
            step="0.01"
            type="number"
          />
        </HrField>
        <HrField id={`${idPrefix}-start-date`} label="Start date">
          <HrTextInput
            defaultValue={defaults.startDate}
            id={`${idPrefix}-start-date`}
            name="startDate"
            required
            type="date"
          />
        </HrField>
      </div>
      <LetterBodyField
        editorKey={`${idPrefix}-${selectedTemplateId}`}
        hint="Edits apply to this candidate only. Master templates under Letters are unchanged."
        idPrefix={idPrefix}
        label="Offer letter"
        name="letterBody"
        onChange={onLetterBodyChange}
        value={letterBody}
      />
    </>
  );
}

function HiddenIds({
  applicationId,
  requisitionId,
  offerId,
}: {
  applicationId: string;
  requisitionId: string;
  offerId?: string;
}) {
  return (
    <>
      <input name="applicationId" type="hidden" value={applicationId} />
      <input name="requisitionId" type="hidden" value={requisitionId} />
      {offerId ? <input name="offerId" type="hidden" value={offerId} /> : null}
    </>
  );
}

export function CandidateDetail({
  detail,
  requisitionId,
  readOnly,
  offerTemplates,
  hasAgreementTemplate,
  canManageLetters,
}: {
  detail: ApplicationDetail;
  requisitionId: string;
  readOnly: boolean;
  offerTemplates: OfferTemplateOption[];
  hasAgreementTemplate: boolean;
  canManageLetters: boolean;
}) {
  const [moveState, moveAction, movePending] = useActionState(moveStageAction, initialState);
  const [createOfferState, createOfferFormAction, createOfferPending] = useActionState(
    createOfferAction,
    initialState,
  );
  const [updateOfferState, updateOfferFormAction, updateOfferPending] = useActionState(
    updateDraftOfferAction,
    initialState,
  );
  const [offerStatusState, offerStatusAction, offerStatusPending] = useActionState(
    setOfferStatusAction,
    initialState,
  );
  const [resendOfferState, resendOfferAction, resendOfferPending] = useActionState(
    resendOfferEmailAction,
    initialState,
  );
  const [updateAgreementState, updateAgreementFormAction, updateAgreementPending] = useActionState(
    updateAgreementBodyAction,
    initialState,
  );
  const [sendAgreementState, sendAgreementFormAction, sendAgreementPending] = useActionState(
    sendAgreementEmailAction,
    initialState,
  );
  const [resendAgreementState, resendAgreementAction, resendAgreementPending] = useActionState(
    resendAgreementEmailAction,
    initialState,
  );
  const [hireState, hireAction, hirePending] = useActionState(confirmHireAction, initialState);

  const stage = detail.application.stage as RecruitmentStage;
  const advanceTargets = nextAdvanceStages(stage);
  const terminal = TERMINAL_STAGES.includes(stage);
  const offer = detail.offer;
  const offerStatus = (offer?.status ?? "draft") as OfferStatus;
  const showCreateOffer = canCreateOffer(stage, Boolean(offer), readOnly);
  const flow = offer
    ? summarizeOfferFlow({
        status: offer.status,
        agreementFileId: offer.agreement_file_id,
        agreementSentAt: offer.agreement_sent_at,
        signedFileId: offer.signed_file_id,
        applicationStage: stage,
      })
    : null;
  const offerBusy =
    offerStatusPending ||
    resendOfferPending ||
    resendAgreementPending ||
    sendAgreementPending ||
    updateAgreementPending ||
    hirePending ||
    updateOfferPending;
  const hired = stage === "hired";
  const readyToHire = Boolean(offer) && canConfirmHire(offer!) && !hired;

  const defaultCreateBody = toEditorHtml(offerTemplates[0]?.body ?? "");
  const [createTemplateId, setCreateTemplateId] = useState(offerTemplates[0]?.id ?? "");
  const [createLetterBody, setCreateLetterBody] = useState(defaultCreateBody);
  const [editTemplateId, setEditTemplateId] = useState(offer?.template_id ?? offerTemplates[0]?.id ?? "");
  const [editLetterBody, setEditLetterBody] = useState(
    toEditorHtml(offer?.letter_body || offerTemplates.find((t) => t.id === offer?.template_id)?.body || ""),
  );
  const [agreementBody, setAgreementBody] = useState(toEditorHtml(offer?.agreement_body ?? ""));

  useEffect(() => {
    if (!offer) return;
    setEditTemplateId(offer.template_id ?? offerTemplates[0]?.id ?? "");
    setEditLetterBody(
      toEditorHtml(offer.letter_body || offerTemplates.find((t) => t.id === offer.template_id)?.body || ""),
    );
    setAgreementBody(toEditorHtml(offer.agreement_body ?? ""));
  }, [offer, offerTemplates]);

  function applyCreateTemplate(templateId: string) {
    setCreateTemplateId(templateId);
    const template = offerTemplates.find((row) => row.id === templateId);
    if (template) setCreateLetterBody(toEditorHtml(template.body));
  }

  function applyEditTemplate(templateId: string) {
    setEditTemplateId(templateId);
    const template = offerTemplates.find((row) => row.id === templateId);
    if (template) setEditLetterBody(toEditorHtml(template.body));
  }

  const offerNotices = [
    offerStatusState,
    updateOfferState,
    resendOfferState,
    updateAgreementState,
    sendAgreementState,
    resendAgreementState,
    hireState,
  ];

  return (
    <div className="space-y-6">
      {readOnly ? (
        <HrBanner>
          This requisition is {detail.requisition.status === "on_hold" ? "on hold" : "closed"}. Stage
          changes are disabled until hiring resumes.
        </HrBanner>
      ) : null}

      <PortalSectionCard title={detail.candidate.full_name}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{formatStageLabel(stage)}</Badge>
            {flow ? <Badge variant={TONE_BADGE[flow.tone]}>Offer: {flow.headline}</Badge> : null}
          </div>
          {flow ? <OfferStatusStrip summary={flow} /> : null}
          {detail.application.employee_id ? (
            <Link
              className="inline-block text-sm font-medium text-primary"
              href={`/hr/employees/${detail.application.employee_id}/edit?hired=1`}
            >
              View draft employee →
            </Link>
          ) : null}
        </div>
      </PortalSectionCard>

      <PortalSectionCard title="Profile">
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="break-all">{detail.candidate.email}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Phone</dt>
            <dd>{detail.candidate.phone?.trim() ? detail.candidate.phone : "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Source</dt>
            <dd>{detail.candidate.source?.trim() ? detail.candidate.source : "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Requisition</dt>
            <dd>
              <Link className="font-medium text-primary" href={`/hr/recruitment/${requisitionId}`}>
                {detail.requisition.title}
              </Link>
            </dd>
          </div>
        </dl>
      </PortalSectionCard>

      {!readOnly && !terminal ? (
        <PortalSectionCard title="Pipeline">
          <div className="grid gap-3 lg:grid-cols-3">
            {advanceTargets.length > 0 ? (
              <details className="rounded-lg border p-3" open={advanceTargets.length <= 1}>
                <summary className="cursor-pointer text-sm font-medium">Advance</summary>
                <div className="mt-3 space-y-3">
                  {advanceTargets.map((toStage) => (
                    <form action={moveAction} className="space-y-2" key={toStage}>
                      <input name="applicationId" type="hidden" value={detail.application.id} />
                      <input name="requisitionId" type="hidden" value={requisitionId} />
                      <input name="toStage" type="hidden" value={toStage} />
                      <HrField id={`notes-advance-${toStage}`} label={`Notes for ${formatStageLabel(toStage)} (optional)`}>
                        <HrTextarea
                          className="min-h-[56px]"
                          id={`notes-advance-${toStage}`}
                          name="notes"
                          placeholder="Reason or context"
                        />
                      </HrField>
                      <HrPrimaryButton disabled={movePending} type="submit">
                        Advance to {formatStageLabel(toStage)}
                      </HrPrimaryButton>
                    </form>
                  ))}
                </div>
              </details>
            ) : null}

            <details className="rounded-lg border p-3">
              <summary className="cursor-pointer text-sm font-medium">Reject</summary>
              <form action={moveAction} className="mt-3 space-y-2">
                <input name="applicationId" type="hidden" value={detail.application.id} />
                <input name="requisitionId" type="hidden" value={requisitionId} />
                <input name="toStage" type="hidden" value="rejected" />
                <HrField id="notes-reject" label="Notes (optional)">
                  <HrTextarea
                    className="min-h-[56px]"
                    id="notes-reject"
                    name="notes"
                    placeholder="Why this candidate was rejected"
                  />
                </HrField>
                <HrGhostButton disabled={movePending} type="submit">
                  Reject candidate
                </HrGhostButton>
              </form>
            </details>

            <details className="rounded-lg border p-3">
              <summary className="cursor-pointer text-sm font-medium">Withdraw</summary>
              <form action={moveAction} className="mt-3 space-y-2">
                <input name="applicationId" type="hidden" value={detail.application.id} />
                <input name="requisitionId" type="hidden" value={requisitionId} />
                <input name="toStage" type="hidden" value="withdrawn" />
                <HrField id="notes-withdraw" label="Notes (optional)">
                  <HrTextarea
                    className="min-h-[56px]"
                    id="notes-withdraw"
                    name="notes"
                    placeholder="Why this application was withdrawn"
                  />
                </HrField>
                <HrGhostButton disabled={movePending} type="submit">
                  Withdraw application
                </HrGhostButton>
              </form>
            </details>
          </div>
          <div className="mt-3">
            <HrFormMessage error={moveState.error} success={moveState.success} />
          </div>
        </PortalSectionCard>
      ) : null}

      <PortalSectionCard title="Offer">
        {readOnly ? (
          offer ? (
            <div className="space-y-3 text-sm">
              {flow ? <OfferStatusStrip summary={flow} /> : null}
              <OfferDownloads offer={offer} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No offer for this candidate.</p>
          )
        ) : showCreateOffer ? (
          offerTemplates.length === 0 ? (
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                No active offer template yet. Offers are generated from a template.
              </p>
              {canManageLetters ? (
                <Link className="font-medium text-primary" href="/hr/letters/new">
                  Create an offer template →
                </Link>
              ) : (
                <p className="text-muted-foreground">Ask an HR administrator to add one under Letters.</p>
              )}
            </div>
          ) : (
            <form action={createOfferFormAction} className="space-y-4">
              <HiddenIds applicationId={detail.application.id} requisitionId={requisitionId} />
              <OfferFields
                defaults={{ jobTitle: detail.requisition.title, templateId: createTemplateId }}
                idPrefix="offer"
                letterBody={createLetterBody}
                onLetterBodyChange={setCreateLetterBody}
                onTemplateChange={applyCreateTemplate}
                templates={offerTemplates}
              />
              <HrPrimaryButton disabled={createOfferPending} type="submit">
                {createOfferPending ? "Creating…" : "Create offer (draft PDF)"}
              </HrPrimaryButton>
              <HrFormMessage error={createOfferState.error} success={createOfferState.success} />
            </form>
          )
        ) : offer ? (
          <OfferPanel
            agreementBody={agreementBody}
            applicationId={detail.application.id}
            hasAgreementTemplate={hasAgreementTemplate}
            hired={hired}
            offer={offer}
            offerBusy={offerBusy}
            offerStatus={offerStatus}
            offerStatusAction={offerStatusAction}
            offerTemplates={offerTemplates}
            onAgreementBodyChange={setAgreementBody}
            onEditLetterBodyChange={setEditLetterBody}
            onEditTemplateChange={applyEditTemplate}
            requisitionId={requisitionId}
            requisitionTitle={detail.requisition.title}
            resendAgreementAction={resendAgreementAction}
            resendOfferAction={resendOfferAction}
            sendAgreementFormAction={sendAgreementFormAction}
            updateAgreementFormAction={updateAgreementFormAction}
            updateOfferFormAction={updateOfferFormAction}
            editLetterBody={editLetterBody}
            editTemplateId={editTemplateId}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Advance this candidate to assessment or offer to create an offer letter.
          </p>
        )}
        {offer && !readOnly ? (
          <div className="mt-4 space-y-2">
            {offerNotices.map((state, index) => (
              <ActionNotices key={index} state={state} />
            ))}
          </div>
        ) : null}
      </PortalSectionCard>

      {readyToHire && !readOnly ? (
        <PortalSectionCard description="Creates the draft employee and starts onboarding when a checklist exists." title="Hire">
          <form action={hireAction}>
            <HiddenIds applicationId={detail.application.id} offerId={offer!.id} requisitionId={requisitionId} />
            <HrPrimaryButton disabled={offerBusy} type="submit">
              Confirm hire
            </HrPrimaryButton>
          </form>
        </PortalSectionCard>
      ) : null}

      <PortalSectionCard title="Timeline">
        {detail.history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No stage history yet.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {detail.history.map((row) => (
              <li className="rounded-lg border px-3 py-2" key={row.id}>
                <p className="font-medium">
                  {row.from_stage && row.from_stage !== row.to_stage
                    ? `${formatStageLabel(row.from_stage)} → `
                    : ""}
                  {formatStageLabel(row.to_stage)}
                </p>
                <p className="text-xs text-muted-foreground">{formatTimestamp(row.created_at)}</p>
                {row.notes?.trim() ? (
                  <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{row.notes}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </PortalSectionCard>
    </div>
  );
}

type OfferRow = NonNullable<ApplicationDetail["offer"]>;
type FormAction = (formData: FormData) => void;

function OfferDownloads({ offer }: { offer: OfferRow }) {
  return (
    <div className="flex flex-wrap gap-2">
      {offer.generated_file_id ? (
        <HrLinkButton href={`/api/files/${offer.generated_file_id}/download`} size="sm" variant="outline">
          Offer PDF
        </HrLinkButton>
      ) : null}
      {offer.agreement_file_id ? (
        <HrLinkButton href={`/api/files/${offer.agreement_file_id}/download`} size="sm" variant="outline">
          Agreement PDF
        </HrLinkButton>
      ) : null}
      {offer.signed_file_id ? (
        <HrLinkButton href={`/api/files/${offer.signed_file_id}/download`} size="sm" variant="outline">
          Signed agreement
        </HrLinkButton>
      ) : null}
    </div>
  );
}

function OfferPanel({
  offer,
  offerStatus,
  offerBusy,
  applicationId,
  requisitionId,
  requisitionTitle,
  offerTemplates,
  hasAgreementTemplate,
  hired,
  offerStatusAction,
  updateOfferFormAction,
  resendOfferAction,
  resendAgreementAction,
  sendAgreementFormAction,
  updateAgreementFormAction,
  editTemplateId,
  editLetterBody,
  onEditTemplateChange,
  onEditLetterBodyChange,
  agreementBody,
  onAgreementBodyChange,
}: {
  offer: OfferRow;
  offerStatus: OfferStatus;
  offerBusy: boolean;
  applicationId: string;
  requisitionId: string;
  requisitionTitle: string;
  offerTemplates: OfferTemplateOption[];
  hasAgreementTemplate: boolean;
  hired: boolean;
  offerStatusAction: FormAction;
  updateOfferFormAction: FormAction;
  resendOfferAction: FormAction;
  resendAgreementAction: FormAction;
  sendAgreementFormAction: FormAction;
  updateAgreementFormAction: FormAction;
  editTemplateId: string;
  editLetterBody: string;
  onEditTemplateChange: (templateId: string) => void;
  onEditLetterBodyChange: (html: string) => void;
  agreementBody: string;
  onAgreementBodyChange: (html: string) => void;
}) {
  const isDraft = offer.status === "draft";
  const canEditAgreement = canEditAgreementBody({
    status: offer.status,
    agreement_sent_at: offer.agreement_sent_at,
    signed_file_id: offer.signed_file_id,
  });
  const awaitingSignature =
    offer.status === "accepted" && Boolean(offer.agreement_sent_at) && !offer.signed_file_id && !hired;

  return (
    <div className="space-y-5">
      {isDraft ? (
        offerTemplates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No active offer template is available to regenerate this draft. Add one under Letters.
          </p>
        ) : (
          <form action={updateOfferFormAction} className="space-y-4">
            <HiddenIds applicationId={applicationId} offerId={offer.id} requisitionId={requisitionId} />
            <OfferFields
              defaults={{
                jobTitle: offer.job_title || requisitionTitle,
                basicSalary: offer.basic_salary,
                startDate: offer.start_date,
                templateId: editTemplateId,
              }}
              idPrefix="edit-offer"
              letterBody={editLetterBody}
              onLetterBodyChange={onEditLetterBodyChange}
              onTemplateChange={onEditTemplateChange}
              templates={offerTemplates}
            />
            <HrGhostButton disabled={offerBusy} type="submit">
              Save draft &amp; regenerate PDF
            </HrGhostButton>
          </form>
        )
      ) : (
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Job title</dt>
            <dd className="font-medium">{offer.job_title}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Basic salary</dt>
            <dd>{offer.basic_salary.toFixed(2)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Start date</dt>
            <dd>{offer.start_date}</dd>
          </div>
        </dl>
      )}

      {offer.sent_at || offer.accepted_at || offer.agreement_sent_at ? (
        <p className="text-xs text-muted-foreground">
          {offer.sent_at ? `Sent ${formatTimestamp(offer.sent_at)}` : null}
          {offer.sent_at && offer.accepted_at ? " · " : null}
          {offer.accepted_at ? `Accepted ${formatTimestamp(offer.accepted_at)}` : null}
          {(offer.sent_at || offer.accepted_at) && offer.agreement_sent_at ? " · " : null}
          {offer.agreement_sent_at ? `Agreement sent ${formatTimestamp(offer.agreement_sent_at)}` : null}
        </p>
      ) : null}

      {canEditAgreement ? (
        <div className="space-y-3 rounded-lg border p-4">
          <div>
            <p className="font-medium">Employment agreement</p>
            <p className="text-sm text-muted-foreground">
              Edit for this candidate, then send. Master templates under Letters stay unchanged.
            </p>
          </div>
          {!hasAgreementTemplate && !offer.agreement_body ? (
            <HrBanner>
              No active employment agreement template. Add one under Letters, or paste the agreement body
              below.
            </HrBanner>
          ) : null}
          <form action={updateAgreementFormAction} className="space-y-3">
            <HiddenIds applicationId={applicationId} offerId={offer.id} requisitionId={requisitionId} />
            <LetterBodyField
              editorKey={`agreement-${offer.id}`}
              idPrefix="agreement"
              label="Agreement letter"
              name="agreementBody"
              onChange={onAgreementBodyChange}
              value={agreementBody}
            />
            <div className="flex flex-wrap gap-2">
              <HrGhostButton disabled={offerBusy} type="submit">
                Save agreement draft
              </HrGhostButton>
            </div>
          </form>
          <form action={sendAgreementFormAction}>
            <HiddenIds applicationId={applicationId} offerId={offer.id} requisitionId={requisitionId} />
            <HrPrimaryButton disabled={offerBusy || agreementBody.trim().length < 10} type="submit">
              Send agreement &amp; email candidate
            </HrPrimaryButton>
          </form>
        </div>
      ) : null}

      {awaitingSignature && !hasAgreementTemplate && !offer.agreement_file_id ? (
        <HrBanner>
          No active employment agreement template. Add one under Letters, then use &ldquo;Resend
          agreement&rdquo;.
        </HrBanner>
      ) : null}

      {offer.signed_file_id && !hired ? (
        <HrBanner>Signed agreement received. Review it, then confirm the hire.</HrBanner>
      ) : null}

      <OfferDownloads offer={offer} />

      <div className="flex flex-wrap gap-2">
        {canTransitionOfferStatus(offerStatus, "sent") ? (
          <form action={offerStatusAction}>
            <HiddenIds applicationId={applicationId} offerId={offer.id} requisitionId={requisitionId} />
            <input name="status" type="hidden" value="sent" />
            <HrPrimaryButton disabled={offerBusy} type="submit">
              Mark sent &amp; email candidate
            </HrPrimaryButton>
          </form>
        ) : null}

        {offer.status === "sent" ? (
          <form action={resendOfferAction}>
            <HiddenIds applicationId={applicationId} offerId={offer.id} requisitionId={requisitionId} />
            <HrGhostButton disabled={offerBusy} type="submit">
              Resend offer email
            </HrGhostButton>
          </form>
        ) : null}

        {awaitingSignature ? (
          <form action={resendAgreementAction}>
            <HiddenIds applicationId={applicationId} offerId={offer.id} requisitionId={requisitionId} />
            <HrGhostButton disabled={offerBusy} type="submit">
              Resend agreement
            </HrGhostButton>
          </form>
        ) : null}

        {canTransitionOfferStatus(offerStatus, "declined") ? (
          <form action={offerStatusAction}>
            <HiddenIds applicationId={applicationId} offerId={offer.id} requisitionId={requisitionId} />
            <input name="status" type="hidden" value="declined" />
            <HrGhostButton disabled={offerBusy} type="submit">
              Record decline
            </HrGhostButton>
          </form>
        ) : null}

        {canTransitionOfferStatus(offerStatus, "withdrawn") ? (
          <form action={offerStatusAction}>
            <HiddenIds applicationId={applicationId} offerId={offer.id} requisitionId={requisitionId} />
            <input name="status" type="hidden" value="withdrawn" />
            <HrGhostButton disabled={offerBusy} type="submit">
              Withdraw offer
            </HrGhostButton>
          </form>
        ) : null}
      </div>
    </div>
  );
}
