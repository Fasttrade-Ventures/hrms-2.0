"use client";

import Link from "next/link";
import { useActionState } from "react";

import { moveStageAction, type RecruitmentActionState } from "@/app/(hr)/hr/recruitment/actions";
import { HrFormMessage, HrGhostButton } from "@/components/hr/employees/form-fields";
import { Badge } from "@/components/ui/badge";
import { PortalSectionCard } from "@/components/portal/portal-section";
import {
  RECRUITMENT_STAGES,
  TERMINAL_STAGES,
  nextAdvanceStages,
  type RecruitmentStage,
} from "@/lib/recruitment/types";
import type { RequisitionStatus } from "@/lib/recruitment/requisition-status";

const initialState: RecruitmentActionState = {};

type PipelineApplication = {
  id: string;
  stage: string;
  employee_id: string | null;
  stage_updated_at: string;
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

function formatStageAge(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days < 1) return "Today";
  if (days === 1) return "1 day in stage";
  return `${days} days in stage`;
}

function ApplicationCard({
  application,
  requisitionId,
  readOnly,
}: {
  application: PipelineApplication;
  requisitionId: string;
  readOnly: boolean;
}) {
  const [moveState, moveAction, movePending] = useActionState(moveStageAction, initialState);

  const candidate = Array.isArray(application.job_candidates)
    ? application.job_candidates[0]
    : application.job_candidates;
  const offer = Array.isArray(application.job_offers) ? application.job_offers[0] : application.job_offers;
  const stage = application.stage as RecruitmentStage;
  const forwards = nextAdvanceStages(stage).slice(0, 2);
  const terminal = TERMINAL_STAGES.includes(stage);
  const detailHref = `/hr/recruitment/${requisitionId}/candidates/${application.id}`;

  return (
    <li className="space-y-2 rounded border p-2">
      <Link className="block space-y-1 hover:opacity-90" href={detailHref}>
        <p className="font-medium text-primary">{candidate?.full_name ?? "Candidate"}</p>
        <p className="text-xs text-muted-foreground">{formatStageAge(application.stage_updated_at)}</p>
        {offer ? (
          <Badge className="mt-1" variant="outline">
            Offer: {offer.status}
          </Badge>
        ) : null}
      </Link>

      {!readOnly && !terminal ? (
        <div className="flex flex-wrap gap-1 border-t pt-2">
          {forwards.map((toStage) => (
            <form action={moveAction} key={toStage}>
              <input name="applicationId" type="hidden" value={application.id} />
              <input name="requisitionId" type="hidden" value={requisitionId} />
              <input name="toStage" type="hidden" value={toStage} />
              <HrGhostButton disabled={movePending} type="submit">
                → {toStage.replaceAll("_", " ")}
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

      <HrFormMessage error={moveState.error} success={moveState.success} />

      {application.employee_id ? (
        <Link
          className="block text-xs text-primary"
          href={`/hr/employees/${application.employee_id}/edit?hired=1`}
        >
          View draft employee →
        </Link>
      ) : null}
    </li>
  );
}

export function RecruitmentPipeline({
  requisitionId,
  requisitionStatus,
  applications,
}: {
  requisitionId: string;
  requisitionStatus: RequisitionStatus;
  applications: PipelineApplication[];
}) {
  const readOnly = requisitionStatus === "on_hold" || requisitionStatus === "closed";
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
        <PortalSectionCard key={stage} title={stage.replaceAll("_", " ")}>
          <ul className="space-y-2 text-sm">
            {(byStage[stage] ?? []).map((application) => (
              <ApplicationCard
                application={application}
                key={application.id}
                readOnly={readOnly}
                requisitionId={requisitionId}
              />
            ))}
          </ul>
        </PortalSectionCard>
      ))}
    </div>
  );
}
