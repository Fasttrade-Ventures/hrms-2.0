import Link from "next/link";

import { formatDate, formatDateTime } from "@/components/employee/employee-shared";
import { Badge } from "@/components/ui/badge";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
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
      <PortalPageHeader
        actions={
          <Link className="text-sm font-medium text-primary hover:underline" href={backHref}>
            Back to announcements
          </Link>
        }
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

      {announcement.isPinned ? (
        <Badge className="w-fit" variant="outline">
          Pinned announcement
        </Badge>
      ) : null}

      <article className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div
          className="prose prose-sm max-w-none text-foreground [&_a]:text-primary [&_ol]:list-decimal [&_ul]:list-disc"
          dangerouslySetInnerHTML={{ __html: announcement.body }}
        />

        {announcement.attachments.length > 0 ? (
          <div className="mt-6 space-y-2 border-t border-border pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Attachments
            </p>
            {announcement.attachments.map((attachment) => (
              <Link
                className="flex items-center rounded-md border border-input bg-muted/30 px-3 py-2 text-sm font-medium hover:bg-muted/60"
                href={`/api/files/${attachment.fileId}/download`}
                key={attachment.fileId}
              >
                Download {attachment.fileName}
              </Link>
            ))}
          </div>
        ) : null}
      </article>
    </div>
  );
}
