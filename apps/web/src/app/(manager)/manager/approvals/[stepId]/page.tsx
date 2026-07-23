import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusPill } from "@hrms/ui";

import { ApprovalActions } from "@/components/manager/approval-actions";
import { PortalSectionCard } from "@/components/portal/portal-section";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { getManagerApprovalDetail } from "@/lib/manager/approvals";
import { requireRole } from "@/lib/auth/session";

function formatFieldLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

export default async function Page({ params }: { params: Promise<{ stepId: string }> }) {
  await requireRole("manager");
  const { stepId } = await params;
  const detail = await getManagerApprovalDetail(stepId);

  if (!detail) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PortalPageHeader
          description={`${detail.requesterName} · ${detail.requesterEmployeeNumber}`}
          title={`${detail.requestTypeLabel} request`}
        />
        <Link
          className="text-sm font-medium text-[var(--accent-primary)]"
          href="/manager/approvals"
        >
          Back to inbox
        </Link>
      </div>

      <PortalSectionCard
        action={<StatusPill label={detail.status} tone="pending" />}
        description={detail.summary}
        title="Request summary"
      >
        <dl className="mt-2 grid gap-4 text-sm sm:grid-cols-2">
          {Object.entries(detail.payload)
            .filter(([key]) => !["sourceTable", "sourceId"].includes(key))
            .map(([key, value]) => (
              <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-3 py-2.5" key={key}>
                <dt className="text-xs text-[var(--foreground-muted)]">{formatFieldLabel(key)}</dt>
                <dd className="mt-1 font-medium text-[var(--foreground-primary)]">
                  {String(value ?? "—")}
                </dd>
              </div>
            ))}
        </dl>
      </PortalSectionCard>

      <ApprovalActions stepId={detail.stepId} />
    </div>
  );
}
