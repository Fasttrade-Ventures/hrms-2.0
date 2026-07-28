"use client";

import { useActionState } from "react";

import {
  acceptOfferAction,
  createOfferAction,
  moveStageAction,
  type RecruitmentActionState,
} from "@/app/(hr)/hr/recruitment/actions";
import { HrFormMessage, HrGhostButton, HrPrimaryButton, HrTextInput } from "@/components/hr/employees/form-fields";
import { PortalSectionCard } from "@/components/portal/portal-section";
import { RECRUITMENT_STAGES, type RecruitmentStage } from "@/lib/recruitment/types";

const initialState: RecruitmentActionState = {};

type PipelineApplication = {
  id: string;
  stage: string;
  employee_id: string | null;
  job_candidates:
    | { full_name: string; email: string; phone: string | null }
    | { full_name: string; email: string; phone: string | null }[]
    | null;
  job_offers:
    | {
        id: string;
        status: string;
        job_title: string;
        basic_salary: number;
        start_date: string;
      }
    | {
        id: string;
        status: string;
        job_title: string;
        basic_salary: number;
        start_date: string;
      }[]
    | null;
};

function nextStages(current: RecruitmentStage): RecruitmentStage[] {
  const idx = RECRUITMENT_STAGES.indexOf(current);
  if (idx < 0) return [];
  return RECRUITMENT_STAGES.slice(idx + 1).filter(
    (stage) => stage !== "rejected" && stage !== "withdrawn",
  );
}

function ApplicationCard({
  application,
  requisitionId,
}: {
  application: PipelineApplication;
  requisitionId: string;
}) {
  const [moveState, moveAction, movePending] = useActionState(moveStageAction, initialState);
  const [offerState, offerAction, offerPending] = useActionState(createOfferAction, initialState);
  const [acceptState, acceptAction, acceptPending] = useActionState(acceptOfferAction, initialState);

  const candidate = Array.isArray(application.job_candidates)
    ? application.job_candidates[0]
    : application.job_candidates;
  const offer = Array.isArray(application.job_offers) ? application.job_offers[0] : application.job_offers;
  const stage = application.stage as RecruitmentStage;
  const forwards = nextStages(stage).slice(0, 2);

  return (
    <li className="space-y-2 rounded border p-2">
      <p className="font-medium">{candidate?.full_name ?? "Candidate"}</p>
      <p className="text-xs text-muted-foreground">{candidate?.email}</p>

      {forwards.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {forwards.map((toStage) => (
            <form action={moveAction} key={toStage}>
              <input name="applicationId" type="hidden" value={application.id} />
              <input name="requisitionId" type="hidden" value={requisitionId} />
              <input name="toStage" type="hidden" value={toStage} />
              <HrGhostButton disabled={movePending} type="submit">
                → {toStage.replace("_", " ")}
              </HrGhostButton>
            </form>
          ))}
          <form action={moveAction}>
            <input name="applicationId" type="hidden" value={application.id} />
            <input name="requisitionId" type="hidden" value={requisitionId} />
            <input name="toStage" type="hidden" value="rejected" />
            <HrGhostButton disabled={movePending} type="submit">
              Reject
            </HrGhostButton>
          </form>
        </div>
      ) : null}

      <HrFormMessage error={moveState.error ?? offerState.error ?? acceptState.error} success={moveState.success ?? offerState.success ?? acceptState.success} />

      {stage === "offer" && !offer ? (
        <form action={offerAction} className="mt-2 space-y-2 border-t pt-2">
          <input name="applicationId" type="hidden" value={application.id} />
          <input name="requisitionId" type="hidden" value={requisitionId} />
          <HrTextInput name="jobTitle" placeholder="Job title" required />
          <HrTextInput name="basicSalary" placeholder="Basic salary" required type="number" />
          <HrTextInput name="startDate" required type="date" />
          <HrPrimaryButton disabled={offerPending} type="submit">
            Create offer
          </HrPrimaryButton>
        </form>
      ) : null}

      {offer && offer.status !== "accepted" ? (
        <form action={acceptAction} className="mt-2 border-t pt-2">
          <input name="offerId" type="hidden" value={offer.id} />
          <input name="requisitionId" type="hidden" value={requisitionId} />
          <p className="mb-2 text-xs text-muted-foreground">
            {offer.job_title} · RM {offer.basic_salary} · starts {offer.start_date}
          </p>
          <HrPrimaryButton disabled={acceptPending} type="submit">
            Accept offer & create draft employee
          </HrPrimaryButton>
        </form>
      ) : null}

      {application.employee_id ? (
        <a className="mt-2 block text-xs text-primary" href={`/hr/employees/${application.employee_id}/edit?hired=1`}>
          View draft employee →
        </a>
      ) : null}
    </li>
  );
}

export function RecruitmentPipeline({
  requisitionId,
  applications,
}: {
  requisitionId: string;
  applications: PipelineApplication[];
}) {
  const byStage: Record<string, PipelineApplication[]> = {};
  for (const stage of RECRUITMENT_STAGES) byStage[stage] = [];
  for (const application of applications) {
    const bucket = byStage[application.stage] ?? [];
    bucket.push(application);
    byStage[application.stage] = bucket;
  }

  return (
    <div className="grid gap-4 overflow-x-auto lg:grid-cols-4 xl:grid-cols-8">
      {RECRUITMENT_STAGES.map((stage) => (
        <PortalSectionCard key={stage} title={stage.replace("_", " ")}>
          <ul className="space-y-2 text-sm">
            {(byStage[stage] ?? []).map((application) => (
              <ApplicationCard application={application} key={application.id} requisitionId={requisitionId} />
            ))}
          </ul>
        </PortalSectionCard>
      ))}
    </div>
  );
}
