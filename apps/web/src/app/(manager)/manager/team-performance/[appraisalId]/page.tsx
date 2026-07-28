import Link from "next/link";
import { notFound } from "next/navigation";

import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { AppraisalSummary } from "@/components/performance/appraisal-summary";
import { RatingSelect } from "@/components/performance/rating-select";
import { submitManagerReviewAction } from "@/app/(manager)/manager/team-performance/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { requireModule } from "@/lib/entitlements";
import { getTeamAppraisal } from "@/lib/manager/performance";
import { appraisalStatusLabel } from "@/lib/performance/types";
import { requireRole } from "@/lib/auth/session";

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

  if (!appraisal) notFound();

  const canReview = appraisal.status === "pending" && !appraisal.cycleClosed;

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <Link
            className="inline-flex h-11 items-center border border-[var(--border-primary)] px-5 text-sm font-medium hover:bg-[var(--surface-muted)]"
            href="/manager/team-performance"
          >
            Back to team performance
          </Link>
        }
        description={`${appraisal.employeeName}${appraisal.employeeNumber ? ` · ${appraisal.employeeNumber}` : ""}`}
        title="Manager review"
      />

      {query.submitted === "1" ? (
        <div className="border border-[var(--accent-primary)] bg-[var(--surface-accent-soft)] px-4 py-3 text-sm text-[var(--accent-primary)]">
          Manager review submitted and marked complete.
        </div>
      ) : null}

      <AppraisalSummary appraisal={appraisal} />

      <section className="space-y-3 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6">
        <h2 className="text-base font-semibold text-[var(--foreground-primary)]">Employee self review</h2>
        {appraisal.selfRating != null ? (
          <div className="space-y-3 text-sm">
            <p className="text-[var(--foreground-secondary)]">Self rating: {appraisal.selfRating}/5</p>
            <p className="text-[var(--foreground-primary)]">
              {appraisal.selfComments?.trim() || "No comments provided."}
            </p>
          </div>
        ) : (
          <p className="text-sm text-[var(--foreground-muted)]">
            {appraisal.status === "draft"
              ? "Waiting for the employee to submit their self appraisal."
              : "No self review submitted."}
          </p>
        )}
      </section>

      <section className="space-y-4 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6">
        <h2 className="text-base font-semibold text-[var(--foreground-primary)]">Your review</h2>
        {canReview ? (
          <form action={submitManagerReviewAction.bind(null, appraisalId)} className="space-y-4">
            <RatingSelect
              defaultValue={appraisal.managerRating}
              id="managerRating"
              label="Manager rating"
              name="managerRating"
            />
            <div className="space-y-2">
              <Label htmlFor="managerComments">Comments</Label>
              <textarea
                className="min-h-32 w-full rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface-card)] px-3 py-2 text-sm"
                defaultValue={appraisal.managerComments ?? ""}
                id="managerComments"
                name="managerComments"
                placeholder="Share feedback, strengths, and development areas."
              />
            </div>
            <Button type="submit">Submit manager review</Button>
          </form>
        ) : (
          <div className="space-y-3 text-sm">
            <p className="text-[var(--foreground-secondary)]">
              Status: {appraisalStatusLabel(appraisal.status)}
            </p>
            <p className="text-[var(--foreground-secondary)]">
              Manager rating: {appraisal.managerRating != null ? `${appraisal.managerRating}/5` : "Not submitted"}
            </p>
            <p className="text-[var(--foreground-primary)]">
              {appraisal.managerComments?.trim() || "No manager comments."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
