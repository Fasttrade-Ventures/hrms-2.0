"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  pointerWithin,
  useDndContext,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { GripVertical } from "@/components/ui/icons";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";

import { moveStageAction, type RecruitmentActionState } from "@/app/(hr)/hr/recruitment/actions";
import { HrFormMessage, HrGhostButton, HrPrimaryButton } from "@/components/hr/employees/form-fields";
import { Badge } from "@/components/ui/badge";
import {
  RECRUITMENT_STAGES,
  TERMINAL_STAGES,
  canDropOnBoardStage,
  nextAdvanceStages,
  type RecruitmentStage,
} from "@/lib/recruitment/types";
import type { RequisitionStatus } from "@/lib/recruitment/requisition-status";
import { cn } from "@/lib/utils";

const initialState: RecruitmentActionState = {};

const INVALID_MOVE_MESSAGE = "That stage move is not allowed.";

/**
 * Pointer drags only count the column actually under the pointer (no neighbour snapping, so a drop on
 * `hired` or dead space never lands on an adjacent column). Keyboard drags have no pointer, so they
 * fall back to closestCorners.
 */
const boardCollisionDetection: CollisionDetection = (args) =>
  args.pointerCoordinates ? pointerWithin(args) : closestCorners(args);

type CandidateInfo = { full_name: string; email: string; phone: string | null; source?: string | null };

type PipelineOffer = {
  id: string;
  status: string;
  job_title: string;
  basic_salary: number;
  start_date: string;
};

type PipelineApplication = {
  id: string;
  stage: string;
  employee_id: string | null;
  stage_updated_at: string;
  job_candidates: CandidateInfo | CandidateInfo[] | null;
  job_offers: PipelineOffer | PipelineOffer[] | null;
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

function pickCandidate(application: PipelineApplication): CandidateInfo | null | undefined {
  return Array.isArray(application.job_candidates)
    ? application.job_candidates[0]
    : application.job_candidates;
}

function pickOffer(application: PipelineApplication): PipelineOffer | null | undefined {
  return Array.isArray(application.job_offers) ? application.job_offers[0] : application.job_offers;
}

/** Static card body, shared by the in-column card and the drag overlay preview. */
function CardSummary({ application, requisitionId }: { application: PipelineApplication; requisitionId: string }) {
  const candidate = pickCandidate(application);
  const offer = pickOffer(application);
  const secondary = candidate?.source?.trim() || candidate?.email || "";
  const detailHref = `/hr/recruitment/${requisitionId}/candidates/${application.id}`;

  return (
    <Link
      className="block min-w-0 flex-1 space-y-1 rounded-md outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
      href={detailHref}
    >
      <p className="truncate text-sm font-semibold text-foreground">{candidate?.full_name ?? "Candidate"}</p>
      {secondary ? <p className="truncate text-xs text-muted-foreground">{secondary}</p> : null}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <span className="text-xs text-muted-foreground">{formatStageAge(application.stage_updated_at)}</span>
        {offer ? (
          <Badge className="capitalize" variant={offerBadgeVariant(offer.status)}>
            Offer {offer.status}
          </Badge>
        ) : null}
      </div>
    </Link>
  );
}

function ApplicationCard({
  application,
  requisitionId,
  readOnly,
  busy,
}: {
  application: PipelineApplication;
  requisitionId: string;
  readOnly: boolean;
  busy: boolean;
}) {
  const [moveState, moveAction, movePending] = useActionState(moveStageAction, initialState);

  const stage = application.stage as RecruitmentStage;
  const nextStage = nextAdvanceStages(stage)[0];
  const terminal = TERMINAL_STAGES.includes(stage);
  const dragDisabled = readOnly || terminal || busy;

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: application.id,
    data: { stage },
    disabled: dragDisabled,
  });

  return (
    <li
      className={cn(
        "rounded-lg border border-border/80 bg-background p-3 shadow-sm",
        isDragging && "opacity-40",
      )}
      ref={setNodeRef}
    >
      <div className="flex items-start gap-1.5">
        {!dragDisabled ? (
          <button
            aria-label={`Drag ${pickCandidate(application)?.full_name ?? "candidate"} to another stage`}
            className="-ml-1 mt-0.5 shrink-0 cursor-grab touch-none rounded p-0.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
            ref={setActivatorNodeRef}
            type="button"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        ) : null}
        <CardSummary application={application} requisitionId={requisitionId} />
      </div>

      {!readOnly && !terminal ? (
        <div className="mt-2 flex flex-wrap gap-1 border-t border-border/60 pt-2">
          {nextStage ? (
            <form action={moveAction}>
              <input name="applicationId" type="hidden" value={application.id} />
              <input name="requisitionId" type="hidden" value={requisitionId} />
              <input name="toStage" type="hidden" value={nextStage} />
              <HrGhostButton disabled={movePending || busy} type="submit">
                Advance
              </HrGhostButton>
            </form>
          ) : null}
          <form action={moveAction}>
            <input name="applicationId" type="hidden" value={application.id} />
            <input name="requisitionId" type="hidden" value={requisitionId} />
            <input name="toStage" type="hidden" value="rejected" />
            <HrGhostButton disabled={movePending || busy} type="submit">
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

function StageColumn({
  stage,
  items,
  requisitionId,
  readOnly,
  busy,
}: {
  stage: RecruitmentStage;
  items: PipelineApplication[];
  requisitionId: string;
  readOnly: boolean;
  busy: boolean;
}) {
  const isTerminal = TERMINAL_STAGES.includes(stage);
  const { active } = useDndContext();
  const activeStage = active?.data.current?.stage as RecruitmentStage | undefined;

  // `hired` stays an enabled droppable so a drop on it resolves to `hired` (and is rejected with an
  // error) instead of snapping to a neighbour; it is just never styled as a valid target.
  const droppable = !readOnly;
  const { setNodeRef, isOver } = useDroppable({ id: stage, disabled: !droppable });

  const dragging = Boolean(activeStage);
  const validTarget = dragging && droppable && canDropOnBoardStage(activeStage as RecruitmentStage, stage);
  const showDropHere = validTarget && isOver;

  return (
    <section
      className={cn(
        "flex w-[260px] shrink-0 flex-col rounded-xl border bg-muted/30 transition-colors",
        isTerminal && "bg-muted/50",
        validTarget && "border-primary/40",
        showDropHere && "border-primary bg-primary/5",
        dragging && !validTarget && "opacity-60",
      )}
      ref={setNodeRef}
    >
      <header className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2.5">
        <h2 className="truncate text-sm font-semibold capitalize text-foreground">{formatStageLabel(stage)}</h2>
        <Badge variant="secondary">{items.length}</Badge>
      </header>
      <ul className="flex min-h-24 max-h-[min(70vh,720px)] flex-col gap-2 overflow-y-auto p-2">
        {showDropHere ? (
          <li className="rounded-lg border border-dashed border-primary px-1 py-4 text-center text-xs font-medium text-primary">
            Drop here
          </li>
        ) : null}
        {items.length === 0 && !showDropHere ? (
          <li className="px-1 py-6 text-center text-xs text-muted-foreground">No candidates</li>
        ) : (
          items.map((application) => (
            <ApplicationCard
              application={application}
              busy={busy}
              key={application.id}
              readOnly={readOnly}
              requisitionId={requisitionId}
            />
          ))
        )}
      </ul>
    </section>
  );
}

export function RecruitmentPipeline({
  requisitionId,
  requisitionStatus,
  applications,
  onRequestAdd,
}: {
  requisitionId: string;
  requisitionStatus: RequisitionStatus;
  applications: PipelineApplication[];
  /** Opens the add-candidate Sheet for the empty-board CTA; undefined when read-only. */
  onRequestAdd?: () => void;
}) {
  const readOnly = requisitionStatus === "on_hold" || requisitionStatus === "closed";
  const [boardError, setBoardError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const byStage: Record<string, PipelineApplication[]> = {};
  for (const stage of RECRUITMENT_STAGES) byStage[stage] = [];
  for (const application of applications) {
    const bucket = byStage[application.stage] ?? [];
    bucket.push(application);
    byStage[application.stage] = bucket;
  }

  const activeApplication = activeId ? applications.find((a) => a.id === activeId) : undefined;

  function handleDragStart(event: DragStartEvent) {
    setBoardError(null);
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    if (readOnly) return;

    const toStage = event.over?.id as RecruitmentStage | undefined;
    const fromStage = event.active.data.current?.stage as RecruitmentStage | undefined;
    const applicationId = String(event.active.id);
    if (!fromStage) return;

    // Dead space (no droppable under the pointer): snap back with the same short error.
    if (!toStage || !RECRUITMENT_STAGES.includes(toStage)) {
      setBoardError(INVALID_MOVE_MESSAGE);
      return;
    }
    if (toStage === fromStage) return;

    if (toStage === "hired" || !canDropOnBoardStage(fromStage, toStage)) {
      setBoardError(INVALID_MOVE_MESSAGE);
      return;
    }

    const formData = new FormData();
    formData.set("applicationId", applicationId);
    formData.set("requisitionId", requisitionId);
    formData.set("toStage", toStage);

    startTransition(async () => {
      const result = await moveStageAction(initialState, formData);
      setBoardError(result.error ?? null);
    });
  }

  const showEmptyCta = applications.length === 0 && !readOnly;

  if (showEmptyCta) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
        <p className="text-sm font-semibold text-foreground">No candidates yet</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Add your first candidate to start moving people through the pipeline.
        </p>
        <HrPrimaryButton disabled={!onRequestAdd} onClick={onRequestAdd}>
          Add candidate
        </HrPrimaryButton>
      </div>
    );
  }

  return (
    <DndContext
      id={`requisition-board-${requisitionId}`}
      collisionDetection={boardCollisionDetection}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
      sensors={sensors}
    >
      {boardError ? (
        <div className="mb-2">
          <HrFormMessage error={boardError} />
        </div>
      ) : null}
      <div className="-mx-1 overflow-x-auto pb-2">
        <div className="flex min-w-max gap-3 px-1">
          {RECRUITMENT_STAGES.map((stage) => (
            <StageColumn
              busy={pending}
              items={byStage[stage] ?? []}
              key={stage}
              readOnly={readOnly}
              requisitionId={requisitionId}
              stage={stage}
            />
          ))}
        </div>
      </div>
      <DragOverlay>
        {activeApplication ? (
          <div className="w-[240px] cursor-grabbing rounded-lg border border-primary bg-background p-3 shadow-lg">
            <div className="flex items-start gap-1.5">
              <CardSummary application={activeApplication} requisitionId={requisitionId} />
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
