import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusPill } from "@hrms/ui";

import { submitSelfAppraisalAction } from "@/app/(employee)/employee/performance/actions";
import { AppraisalSummary } from "@/components/performance/appraisal-summary";
import { CriteriaQuestionsFields } from "@/components/performance/criteria-questions";
import { GoalList } from "@/components/performance/goal-list";
import { KpiScoreList } from "@/components/performance/kpi-score-list";
import { RatingSelect } from "@/components/performance/rating-select";
import { PortalPrimaryButton, PortalSectionCard } from "@/components/portal/portal-section";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { Label } from "@/components/ui/label";
import { RichText } from "@/components/ui/rich-text";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { getMyAppraisal } from "@/lib/employee/performance";
import { requireModule } from "@/lib/entitlements";
import { getTemplateSectionsForForm } from "@/lib/performance/criteria";
import { listAppraisalKpis } from "@/lib/performance/kpi-service";
import { appraisalStatusLabel, appraisalStatusTone } from "@/lib/performance/types";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ appraisalId: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  await requireModule("performance");
  const { appraisalId } = await params;
  const query = await searchParams;
  const appraisal = await getMyAppraisal(appraisalId);
  const kpis = appraisal
    ? await listAppraisalKpis(appraisalId).catch(() => ({ rows: [], rating: null }))
    : null;
  const templateSections = appraisal
    ? await getTemplateSectionsForForm(appraisal.templateId).catch(() => [])
    : [];

  if (!appraisal) notFound();

  const canEdit = appraisal.status === "draft" && !appraisal.cycleClosed;
  const hasCriteria = templateSections.some((s) => s.questions.length > 0);
  const hasKpis = Boolean(kpis?.rows.length);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PortalPageHeader
          description={`${appraisal.cycleName} · ${appraisalStatusLabel(appraisal.status)}`}
          title="Self appraisal"
        />
        <Link className="text-sm font-medium text-[var(--accent-primary)]" href="/employee/performance">
          Back to performance
        </Link>
      </div>

      {query.submitted === "1" ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--accent-primary)] bg-[var(--surface-accent-soft)] px-4 py-3 text-sm text-[var(--accent-primary)]">
          Self appraisal submitted. Your manager will complete their review next.
        </div>
      ) : null}

      <AppraisalSummary appraisal={appraisal} />

      {hasKpis && kpis ? (
        <KpiScoreList
          appraisalId={appraisalId}
          rating={kpis.rating}
          rows={kpis.rows}
          side="employee"
        />
      ) : null}

      <PortalSectionCard
        action={
          <StatusPill
            label={appraisalStatusLabel(appraisal.status)}
            tone={appraisalStatusTone(appraisal.status)}
          />
        }
        description={
          canEdit
            ? hasCriteria
              ? "Answer each question, then add an overall rating and submit."
              : "Rate yourself and share comments before submitting."
            : "Your submitted self appraisal."
        }
        title="Your review"
      >
        {canEdit ? (
          <form action={submitSelfAppraisalAction.bind(null, appraisalId)} className="space-y-6">
            {hasCriteria ? (
              <CriteriaQuestionsFields
                mode="employee_edit"
                responses={appraisal.criteriaResponses ?? []}
                sections={templateSections}
              />
            ) : null}
            <RatingSelect
              defaultValue={appraisal.selfRating}
              id="selfRating"
              label="Overall self rating"
              name="selfRating"
            />
            <div className="space-y-2">
              <Label>Additional comments (optional)</Label>
              <RichTextEditor
                defaultValue={appraisal.selfComments ?? ""}
                name="selfComments"
                placeholder="Anything else you want your manager to know."
              />
            </div>
            <PortalPrimaryButton type="submit">Submit self appraisal</PortalPrimaryButton>
          </form>
        ) : (
          <div className="space-y-6">
            {hasCriteria ? (
              <CriteriaQuestionsFields
                mode="employee_view"
                responses={appraisal.criteriaResponses ?? []}
                sections={templateSections}
              />
            ) : null}
            <div className="space-y-3 text-sm">
              <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-3 py-2.5">
                <p className="text-xs text-[var(--foreground-muted)]">Overall self rating</p>
                <p className="mt-1 font-medium text-[var(--foreground-primary)]">
                  {appraisal.selfRating != null ? `${appraisal.selfRating}/5` : "Not submitted"}
                </p>
              </div>
              <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-3 py-2.5">
                <p className="text-xs text-[var(--foreground-muted)]">Comments</p>
                <div className="mt-1">
                  <RichText empty="No comments provided." value={appraisal.selfComments} />
                </div>
              </div>
            </div>
          </div>
        )}
      </PortalSectionCard>

      {appraisal.status !== "draft" ? (
        <PortalSectionCard
          action={
            appraisal.managerRating != null ? (
              <StatusPill label={`${appraisal.managerRating}/5`} tone="success" />
            ) : (
              <StatusPill label="Pending" tone="warning" />
            )
          }
          description="Feedback from your manager once their review is complete."
          title="Manager review"
        >
          {appraisal.managerRating != null ? (
            <div className="space-y-3 text-sm">
              <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-3 py-2.5">
                <p className="text-xs text-[var(--foreground-muted)]">Manager rating</p>
                <p className="mt-1 font-medium text-[var(--foreground-primary)]">
                  {appraisal.managerRating}/5
                </p>
              </div>
              <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-3 py-2.5">
                <p className="text-xs text-[var(--foreground-muted)]">Comments</p>
                <div className="mt-1">
                  <RichText empty="No manager comments." value={appraisal.managerComments} />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--foreground-muted)]">Pending manager review.</p>
          )}
        </PortalSectionCard>
      ) : null}

      <GoalList
        canAdd={canEdit}
        canComment={false}
        cycleId={appraisal.cycleId}
        employeeId={appraisal.employeeId}
      />
    </div>
  );
}
