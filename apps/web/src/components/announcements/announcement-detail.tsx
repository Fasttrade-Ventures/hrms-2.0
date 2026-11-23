import Link from "next/link";

import { StatusPill } from "@hrms/ui";

import { formatDate, formatDateTime } from "@/components/employee/employee-shared";
import { PortalSectionCard } from "@/components/portal/portal-section";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { RichText } from "@/components/ui/rich-text";
import type { AnnouncementRecord } from "@/lib/announcements/queries";

export function AnnouncementDetail({
  announcement,
  backHref,
}: {
  announcement: AnnouncementRecord;
  backHref: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PortalPageHeader
          description={[
            announcement.postedAt
              ? formatDateTime(announcement.postedAt)
              : announcement.displayFrom
                ? `From ${formatDate(announcement.displayFrom)}`
                : null,
            announcement.displayUntil ? `Until ${formatDate(announcement.displayUntil)}` : null,
          ]
            .filter(Boolean)
            .join(" · ") || undefined}
          title={announcement.title}
        />
        <Link className="text-sm font-medium text-[var(--accent-primary)]" href={backHref}>
          Back to announcements
        </Link>
      </div>

      <PortalSectionCard
        action={announcement.isPinned ? <StatusPill label="Pinned" tone="neutral" /> : undefined}
        description="Full announcement body and any attached files."
        title="Announcement"
      >
        <RichText empty="No content." value={announcement.body} />

        {announcement.attachments.length > 0 ? (
          <div className="mt-6 space-y-2 border-t border-[var(--border-primary)] pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--foreground-muted)]">
              Attachments
            </p>
            {announcement.attachments.map((attachment) => (
              <Link
                className="flex items-center rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface-muted)] px-3 py-2 text-sm font-medium text-[var(--accent-primary)] hover:bg-[var(--surface-card)]"
                href={`/api/files/${attachment.fileId}/download`}
                key={attachment.fileId}
              >
                Download {attachment.fileName}
              </Link>
            ))}
          </div>
        ) : null}
      </PortalSectionCard>
    </div>
  );
}
