"use client";

import Link from "next/link";
import { useActionState } from "react";

import { moveStageAction, type RecruitmentActionState } from "@/app/(hr)/hr/recruitment/actions";
import { HrFormMessage, HrGhostButton } from "@/components/hr/employees/form-fields";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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

function formatStageLabel(stage: string): string {
  return stage.replaceAll("_", " ");
}

function formatStageAge(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days < 1) return "Today";
  if (days === 1) return "1d in stage";
  return `${days}d in stage`;
}

function offerBadgeVariant(status: string): "outline" | "secondary" | "success" | "warning" {
  if (status === "accepted") return "success";
  if (status === "sent") return "secondary";
  if (status === "declined" || status === "withdrawn") return "warning";
  return "outline";
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
  const nextStage = nextAdvanceStages(stage)[0];
  const terminal = TERMINAL_STAGES.includes(stage);
  const detailHref = `/hr/recruitment/${requisitionId}/candidates/${application.id}`;

  return (
    <li className="rounded-lg border border-border/80 bg-background p-3 shadow-sm">
      <Link className="block space-y-1.5 rounded-md outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring" href={detailHref}>
        <p className="truncate text-sm font-semibold text-foreground">{candidate?.full_name ?? "Candidate"}</p>
        <p className="text-xs text-muted-foreground">{formatStageAge(application.stage_updated_at)}</p>
        {offer ? (
          <Badge className="mt-0.5 capitalize" variant={offerBadgeVariant(offer.status)}>
            {offer.status}
          </Badge>
        ) : null}
      </Link>

      {!readOnly && !terminal ? (
        <div className="mt-2 flex flex-wrap gap-1 border-t border-border/60 pt-2">
          {nextStage ? (
            <form action={moveAction}>
              <input name="applicationId" type="hidden" value={application.id} />
              <input name="requisitionId" type="hidden" value={requisitionId} />
              <input name="toStage" type="hidden" value={nextStage} />
              <HrGhostButton disabled={movePending} type="submit">
                Advance
              </HrGhostButton>
            </form>
          ) : null}
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
          className="mt-2 block text-xs font-medium text-primary"
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
    <div className="-mx-1 overflow-x-auto pb-2">
      <div className="flex min-w-max gap-3 px-1">
        {RECRUITMENT_STAGES.map((stage) => {
          const items = byStage[stage] ?? [];
          const isTerminal = TERMINAL_STAGES.includes(stage);
          return (
            <section
              className={cn(
                "flex w-[240px] shrink-0 flex-col rounded-xl border bg-muted/30",
                isTerminal && "bg-muted/50",
              )}
              key={stage}
            >
              <header className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2.5">
                <h2 className="truncate text-sm font-semibold capitalize text-foreground">
                  {formatStageLabel(stage)}
                </h2>
                <Badge variant="secondary">{items.length}</Badge>
              </header>
              <ul className="flex max-h-[min(70vh,720px)] flex-col gap-2 overflow-y-auto p-2">
                {items.length === 0 ? (
                  <li className="px-1 py-6 text-center text-xs text-muted-foreground">No candidates</li>
                ) : (
                  items.map((application) => (
                    <ApplicationCard
                      application={application}
                      key={application.id}
                      readOnly={readOnly}
                      requisitionId={requisitionId}
                    />
                  ))
                )}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
