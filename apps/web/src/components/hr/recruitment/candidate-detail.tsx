"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  acceptOfferAction,
  createOfferAction,
  moveStageAction,
  setOfferStatusAction,
  type RecruitmentActionState,
} from "@/app/(hr)/hr/recruitment/actions";
import {
  HrField,
  HrFormMessage,
  HrGhostButton,
  HrPrimaryButton,
  HrTextarea,
  HrTextInput,
} from "@/components/hr/employees/form-fields";
import { HrLinkButton } from "@/components/hr/hr-ui.client";
import { HrBanner } from "@/components/hr/hr-ui";
import { canTransitionOfferStatus, type OfferStatus } from "@/lib/recruitment/offer-status";
import { Badge } from "@/components/ui/badge";
import type { ApplicationDetail } from "@/lib/recruitment/applications";
import { TERMINAL_STAGES, nextAdvanceStages, type RecruitmentStage } from "@/lib/recruitment/types";
import { PortalSectionCard } from "@/components/portal/portal-section";

const initialState: RecruitmentActionState = {};

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

function canAcceptOffer(status: string): boolean {
  return status === "draft" || status === "sent";
}

export function CandidateDetail({
  detail,
  requisitionId,
  readOnly,
}: {
  detail: ApplicationDetail;
  requisitionId: string;
  readOnly: boolean;
}) {
  const [moveState, moveAction, movePending] = useActionState(moveStageAction, initialState);
  const [createOfferState, createOfferFormAction, createOfferPending] = useActionState(
    createOfferAction,
    initialState,
  );
  const [offerStatusState, offerStatusAction, offerStatusPending] = useActionState(
    setOfferStatusAction,
    initialState,
  );
  const [acceptState, acceptAction, acceptPending] = useActionState(acceptOfferAction, initialState);
  const stage = detail.application.stage as RecruitmentStage;
  const advanceTargets = nextAdvanceStages(stage);
  const terminal = TERMINAL_STAGES.includes(stage);
  const offer = detail.offer;
  const offerStatus = (offer?.status ?? "draft") as OfferStatus;
  const showCreateOffer = canCreateOffer(stage, Boolean(offer), readOnly);
  const offerActionsPending = offerStatusPending || acceptPending;

  return (
    <div className="space-y-6">
      {readOnly ? (
        <HrBanner>
          This requisition is {detail.requisition.status === "on_hold" ? "on hold" : "closed"}. Stage
          changes are disabled until hiring resumes.
        </HrBanner>
      ) : null}

      <PortalSectionCard title="Candidate">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Full name</dt>
            <dd className="font-medium">{detail.candidate.full_name}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Stage</dt>
            <dd>
              <Badge variant="secondary">{formatStageLabel(stage)}</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd>{detail.candidate.email}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Phone</dt>
            <dd>{detail.candidate.phone?.trim() ? detail.candidate.phone : "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Source</dt>
            <dd>{detail.candidate.source?.trim() ? detail.candidate.source : "—"}</dd>
          </div>
        </dl>
        {detail.application.employee_id ? (
          <Link
            className="mt-4 inline-block text-sm font-medium text-primary"
            href={`/hr/employees/${detail.application.employee_id}/edit?hired=1`}
          >
            View draft employee →
          </Link>
        ) : null}
      </PortalSectionCard>

      {!readOnly && !terminal ? (
        <PortalSectionCard title="Stage">
          <div className="space-y-4">
            {advanceTargets.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-medium">Advance</p>
                {advanceTargets.map((toStage) => (
                  <form action={moveAction} className="space-y-2 rounded-lg border p-3" key={toStage}>
                    <input name="applicationId" type="hidden" value={detail.application.id} />
                    <input name="requisitionId" type="hidden" value={requisitionId} />
                    <input name="toStage" type="hidden" value={toStage} />
                    <HrField id={`notes-advance-${toStage}`} label="Notes (optional)">
                      <HrTextarea
                        id={`notes-advance-${toStage}`}
                        name="notes"
                        placeholder="Reason or context for this move"
                      />
                    </HrField>
                    <HrPrimaryButton disabled={movePending} type="submit">
                      Advance to {formatStageLabel(toStage)}
                    </HrPrimaryButton>
                  </form>
                ))}
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              <form action={moveAction} className="space-y-2 rounded-lg border p-3">
                <input name="applicationId" type="hidden" value={detail.application.id} />
                <input name="requisitionId" type="hidden" value={requisitionId} />
                <input name="toStage" type="hidden" value="rejected" />
                <p className="text-sm font-medium">Reject</p>
                <HrField id="notes-reject" label="Notes (optional)">
                  <HrTextarea id="notes-reject" name="notes" placeholder="Why this candidate was rejected" />
                </HrField>
                <HrGhostButton disabled={movePending} type="submit">
                  Reject candidate
                </HrGhostButton>
              </form>

              <form action={moveAction} className="space-y-2 rounded-lg border p-3">
                <input name="applicationId" type="hidden" value={detail.application.id} />
                <input name="requisitionId" type="hidden" value={requisitionId} />
                <input name="toStage" type="hidden" value="withdrawn" />
                <p className="text-sm font-medium">Withdraw</p>
                <HrField id="notes-withdraw" label="Notes (optional)">
                  <HrTextarea id="notes-withdraw" name="notes" placeholder="Why this application was withdrawn" />
                </HrField>
                <HrGhostButton disabled={movePending} type="submit">
                  Withdraw application
                </HrGhostButton>
              </form>
            </div>

            <HrFormMessage error={moveState.error} success={moveState.success} />
          </div>
        </PortalSectionCard>
      ) : null}

      {!readOnly ? (
        <PortalSectionCard title="Offer">
          {showCreateOffer ? (
            <form action={createOfferFormAction} className="space-y-4">
              <input name="applicationId" type="hidden" value={detail.application.id} />
              <input name="requisitionId" type="hidden" value={requisitionId} />
              <HrField id="offer-job-title" label="Job title">
                <HrTextInput
                  defaultValue={detail.requisition.title}
                  id="offer-job-title"
                  name="jobTitle"
                  required
                />
              </HrField>
              <HrField id="offer-basic-salary" label="Basic salary">
                <HrTextInput
                  id="offer-basic-salary"
                  min={0}
                  name="basicSalary"
                  required
                  step="0.01"
                  type="number"
                />
              </HrField>
              <HrField id="offer-start-date" label="Start date">
                <HrTextInput id="offer-start-date" name="startDate" required type="date" />
              </HrField>
              <HrPrimaryButton disabled={createOfferPending} type="submit">
                Create offer (draft PDF)
              </HrPrimaryButton>
              <HrFormMessage error={createOfferState.error} success={createOfferState.success} />
            </form>
          ) : offer ? (
            <div className="space-y-4">
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>
                    <Badge variant="outline">{offer.status}</Badge>
                  </dd>
                </div>
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

              <div className="flex flex-wrap gap-2">
                {offer.generated_file_id ? (
                  <HrLinkButton href={`/api/files/${offer.generated_file_id}/download`} size="sm" variant="outline">
                    Download PDF
                  </HrLinkButton>
                ) : null}

                {canTransitionOfferStatus(offerStatus, "sent") ? (
                  <form action={offerStatusAction}>
                    <input name="applicationId" type="hidden" value={detail.application.id} />
                    <input name="offerId" type="hidden" value={offer.id} />
                    <input name="requisitionId" type="hidden" value={requisitionId} />
                    <input name="status" type="hidden" value="sent" />
                    <HrPrimaryButton disabled={offerActionsPending} type="submit">
                      Mark sent
                    </HrPrimaryButton>
                  </form>
                ) : null}

                {canAcceptOffer(offer.status) ? (
                  <form action={acceptAction}>
                    <input name="applicationId" type="hidden" value={detail.application.id} />
                    <input name="offerId" type="hidden" value={offer.id} />
                    <input name="requisitionId" type="hidden" value={requisitionId} />
                    <HrPrimaryButton disabled={offerActionsPending} type="submit">
                      Accept offer
                    </HrPrimaryButton>
                  </form>
                ) : null}

                {canTransitionOfferStatus(offerStatus, "declined") ? (
                  <form action={offerStatusAction}>
                    <input name="applicationId" type="hidden" value={detail.application.id} />
                    <input name="offerId" type="hidden" value={offer.id} />
                    <input name="requisitionId" type="hidden" value={requisitionId} />
                    <input name="status" type="hidden" value="declined" />
                    <HrGhostButton disabled={offerActionsPending} type="submit">
                      Decline
                    </HrGhostButton>
                  </form>
                ) : null}

                {canTransitionOfferStatus(offerStatus, "withdrawn") ? (
                  <form action={offerStatusAction}>
                    <input name="applicationId" type="hidden" value={detail.application.id} />
                    <input name="offerId" type="hidden" value={offer.id} />
                    <input name="requisitionId" type="hidden" value={requisitionId} />
                    <input name="status" type="hidden" value="withdrawn" />
                    <HrGhostButton disabled={offerActionsPending} type="submit">
                      Withdraw offer
                    </HrGhostButton>
                  </form>
                ) : null}
              </div>

              <HrFormMessage
                error={offerStatusState.error ?? acceptState.error}
                success={offerStatusState.success ?? acceptState.success}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Advance this candidate to assessment or offer to create an offer letter.
            </p>
          )}
        </PortalSectionCard>
      ) : offer ? (
        <PortalSectionCard title="Offer">
          <div className="space-y-2 text-sm">
            <p>
              Status: <Badge variant="outline">{offer.status}</Badge>
            </p>
            {offer.generated_file_id ? (
              <HrLinkButton href={`/api/files/${offer.generated_file_id}/download`} size="sm" variant="outline">
                Download PDF
              </HrLinkButton>
            ) : null}
          </div>
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
                  {row.from_stage ? `${formatStageLabel(row.from_stage)} → ` : ""}
                  {formatStageLabel(row.to_stage)}
                </p>
                <p className="text-xs text-muted-foreground">{formatTimestamp(row.created_at)}</p>
                {row.notes?.trim() ? <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{row.notes}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </PortalSectionCard>
    </div>
  );
}
