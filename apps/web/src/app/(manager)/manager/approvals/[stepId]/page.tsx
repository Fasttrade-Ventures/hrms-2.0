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

  const attachmentFileId = detail.payload.attachmentFileId as string | undefined;
  const attachmentFileName = detail.payload.attachmentFileName as string | undefined;

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
        action={
          <StatusPill
            label={detail.status.charAt(0).toUpperCase() + detail.status.slice(1)}
            tone={detail.status === "pending" ? "warning" : detail.status === "approved" ? "success" : "danger"}
          />
        }
        description={detail.summary}
        title="Request summary"
      >
        <dl className="mt-2 grid gap-4 text-sm sm:grid-cols-2">
          {Object.entries(detail.payload)
            .filter(([key]) => !["sourceTable", "sourceId", "attachmentFileId", "attachmentFileName"].includes(key))
            .map(([key, value]) => (
              <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-3 py-2.5" key={key}>
                <dt className="text-xs text-[var(--foreground-muted)]">{formatFieldLabel(key)}</dt>
                <dd className="mt-1 font-medium text-[var(--foreground-primary)]">
                  {String(value ?? "—")}
                </dd>
              </div>
            ))}
        </dl>

        {attachmentFileId && (
          <div className="mt-4 border-t border-[var(--border-primary)] pt-4">
            <p className="text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider">Attachment</p>
            <div className="mt-2">
              <Link
                href={`/api/files/${attachmentFileId}/download`}
                target="_blank"
                className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent-primary)] hover:underline"
              >
                📎 {attachmentFileName ?? "Download attachment"}
              </Link>
            </div>
          </div>
        )}
      </PortalSectionCard>

      <ApprovalActions stepId={detail.stepId} />
    </div>
  );
}
