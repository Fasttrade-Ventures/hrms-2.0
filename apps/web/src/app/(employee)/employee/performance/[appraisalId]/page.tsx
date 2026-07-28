import Link from "next/link";
import { notFound } from "next/navigation";

import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { AppraisalSummary } from "@/components/performance/appraisal-summary";
import { RatingSelect } from "@/components/performance/rating-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { submitSelfAppraisalAction } from "@/app/(employee)/employee/performance/actions";
import { getMyAppraisal } from "@/lib/employee/performance";
import { requireModule } from "@/lib/entitlements";
import { appraisalStatusLabel } from "@/lib/performance/types";

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

  if (!appraisal) notFound();

  const canEdit = appraisal.status === "draft" && !appraisal.cycleClosed;

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <Link
            className="inline-flex h-11 items-center border border-[var(--border-primary)] px-5 text-sm font-medium hover:bg-[var(--surface-muted)]"
            href="/employee/performance"
          >
            Back to performance
          </Link>
        }
        description={`${appraisal.cycleName} · ${appraisalStatusLabel(appraisal.status)}`}
        title="Self appraisal"
      />

      {query.submitted === "1" ? (
        <div className="border border-[var(--accent-primary)] bg-[var(--surface-accent-soft)] px-4 py-3 text-sm text-[var(--accent-primary)]">
          Self appraisal submitted. Your manager will complete their review next.
        </div>
      ) : null}

      <AppraisalSummary appraisal={appraisal} />

      <section className="space-y-4 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6">
        <h2 className="text-base font-semibold text-[var(--foreground-primary)]">Your review</h2>
        {canEdit ? (
          <form action={submitSelfAppraisalAction.bind(null, appraisalId)} className="space-y-4">
            <RatingSelect
              defaultValue={appraisal.selfRating}
              id="selfRating"
              label="Self rating"
              name="selfRating"
            />
            <div className="space-y-2">
              <Label htmlFor="selfComments">Comments</Label>
              <textarea
                className="min-h-32 w-full rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface-card)] px-3 py-2 text-sm"
                defaultValue={appraisal.selfComments ?? ""}
                id="selfComments"
                name="selfComments"
                placeholder="Summarize your achievements, growth areas, and goals."
              />
            </div>
            <Button type="submit">Submit self appraisal</Button>
          </form>
        ) : (
          <div className="space-y-3 text-sm">
            <p className="text-[var(--foreground-secondary)]">
              Self rating: {appraisal.selfRating != null ? `${appraisal.selfRating}/5` : "Not submitted"}
            </p>
            <p className="text-[var(--foreground-primary)]">
              {appraisal.selfComments?.trim() || "No comments provided."}
            </p>
          </div>
        )}
      </section>

      {appraisal.status !== "draft" ? (
        <section className="space-y-3 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6">
          <h2 className="text-base font-semibold text-[var(--foreground-primary)]">Manager review</h2>
          {appraisal.managerRating != null ? (
            <div className="space-y-3 text-sm">
              <p className="text-[var(--foreground-secondary)]">Manager rating: {appraisal.managerRating}/5</p>
              <p className="text-[var(--foreground-primary)]">
                {appraisal.managerComments?.trim() || "No manager comments."}
              </p>
            </div>
          ) : (
            <p className="text-sm text-[var(--foreground-muted)]">Pending manager review.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
