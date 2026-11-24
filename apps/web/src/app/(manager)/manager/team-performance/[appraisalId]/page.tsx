import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusPill } from "@hrms/ui";

import { submitManagerReviewAction } from "@/app/(manager)/manager/team-performance/actions";
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
import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";
import { getTeamAppraisal } from "@/lib/manager/performance";
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
  await requireRole("manager");
  await requireModule("performance");
  const { appraisalId } = await params;
  const query = await searchParams;
  const appraisal = await getTeamAppraisal(appraisalId);
  const kpis = appraisal
    ? await listAppraisalKpis(appraisalId).catch(() => ({ rows: [], rating: null }))
    : null;
  const templateSections = appraisal
    ? await getTemplateSectionsForForm(appraisal.templateId).catch(() => [])
    : [];

  if (!appraisal) notFound();

  const canReview = appraisal.status === "pending" && !appraisal.cycleClosed;
  const hasCriteria = templateSections.some((s) => s.questions.length > 0);
  const hasKpis = Boolean(kpis?.rows.length);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PortalPageHeader
          description={`${appraisal.employeeName}${appraisal.employeeNumber ? ` · ${appraisal.employeeNumber}` : ""}`}
          title="Manager review"
        />
        <Link
          className="text-sm font-medium text-[var(--accent-primary)]"
          href="/manager/team-performance"
        >
          Back to team performance
        </Link>
      </div>

      {query.submitted === "1" ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--accent-primary)] bg-[var(--surface-accent-soft)] px-4 py-3 text-sm text-[var(--accent-primary)]">
          Manager review submitted and marked complete.
        </div>
      ) : null}

      <AppraisalSummary appraisal={appraisal} />

      {hasKpis && kpis ? (
        <KpiScoreList
          appraisalId={appraisalId}
          rating={kpis.rating}
          rows={kpis.rows}
          side="manager"
        />
      ) : null}

      <PortalSectionCard
        action={
          appraisal.selfRating != null ? (
            <StatusPill label={`${appraisal.selfRating}/5`} tone="success" />
          ) : (
            <StatusPill label="Waiting" tone="warning" />
          )
        }
        description="Answers and comments submitted by the employee."
        title="Employee self review"
      >
        {appraisal.selfRating != null ? (
          <div className="space-y-6">
            {hasCriteria ? (
              <CriteriaQuestionsFields
                mode="manager_view"
                responses={appraisal.criteriaResponses ?? []}
                sections={templateSections}
              />
            ) : null}
            <div className="space-y-3 text-sm">
              <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-3 py-2.5">
                <p className="text-xs text-[var(--foreground-muted)]">Overall self rating</p>
                <p className="mt-1 font-medium text-[var(--foreground-primary)]">
                  {appraisal.selfRating}/5
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
        ) : (
          <p className="text-sm text-[var(--foreground-muted)]">
            {appraisal.status === "draft"
              ? "Waiting for the employee to submit their self appraisal."
              : "No self review submitted."}
          </p>
        )}
      </PortalSectionCard>

      <PortalSectionCard
        action={
          <StatusPill
            label={appraisalStatusLabel(appraisal.status)}
            tone={appraisalStatusTone(appraisal.status)}
          />
        }
        description={
          canReview
            ? "Submit your rating and feedback to complete this appraisal."
            : "Your submitted manager review for this cycle."
        }
        title="Your review"
      >
        {canReview ? (
          <form action={submitManagerReviewAction.bind(null, appraisalId)} className="space-y-4">
            <RatingSelect
              defaultValue={appraisal.managerRating}
              id="managerRating"
              label="Manager rating"
              name="managerRating"
            />
            <div className="space-y-2">
              <Label>Comments</Label>
              <RichTextEditor
                defaultValue={appraisal.managerComments ?? ""}
                name="managerComments"
                placeholder="Share feedback, strengths, and development areas."
              />
            </div>
            <PortalPrimaryButton type="submit">Submit manager review</PortalPrimaryButton>
          </form>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-3 py-2.5">
              <p className="text-xs text-[var(--foreground-muted)]">Manager rating</p>
              <p className="mt-1 font-medium text-[var(--foreground-primary)]">
                {appraisal.managerRating != null ? `${appraisal.managerRating}/5` : "Not submitted"}
              </p>
            </div>
            <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-3 py-2.5">
              <p className="text-xs text-[var(--foreground-muted)]">Comments</p>
              <div className="mt-1">
                <RichText empty="No manager comments." value={appraisal.managerComments} />
              </div>
            </div>
          </div>
        )}
      </PortalSectionCard>

      <GoalList
        canAdd={false}
        canComment={canReview}
        cycleId={appraisal.cycleId}
        employeeId={appraisal.employeeId}
      />
    </div>
  );
}
