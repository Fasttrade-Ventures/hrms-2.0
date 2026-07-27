"use client";

import Link from "next/link";

import { formatDate, formatDateTime } from "@/components/employee/employee-shared";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { HrAnnouncementRow } from "@/lib/hr/announcements";

const statusLabels: Record<HrAnnouncementRow["displayStatus"], string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  active: "Active",
  expired: "Closed",
};

const statusVariant: Record<
  HrAnnouncementRow["displayStatus"],
  "secondary" | "default" | "outline" | "destructive"
> = {
  draft: "secondary",
  scheduled: "outline",
  active: "default",
  expired: "destructive",
};

function formatDisplayWindow(item: HrAnnouncementRow): string {
  if (!item.displayFrom && !item.displayUntil) return "Always on";
  const from = item.displayFrom ? formatDate(item.displayFrom) : "Now";
  const until = item.displayUntil ? formatDate(item.displayUntil) : "Open";
  return `${from} → ${until}`;
}

export function AnnouncementViewDialog({
  announcement,
  onOpenChange,
  open,
}: {
  announcement: HrAnnouncementRow | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  if (!announcement) return null;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{announcement.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant[announcement.displayStatus]}>
              {statusLabels[announcement.displayStatus]}
            </Badge>
            {announcement.postedAt ? (
              <span className="text-sm text-muted-foreground">
                Posted {formatDateTime(announcement.postedAt)}
              </span>
            ) : null}
          </div>

          <dl className="grid gap-3 rounded-lg border border-border bg-muted/20 p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Audience
              </dt>
              <dd className="mt-1 text-foreground">{announcement.audienceSummary}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Display window
              </dt>
              <dd className="mt-1 text-foreground">{formatDisplayWindow(announcement)}</dd>
              {announcement.displayUntil && announcement.displayStatus === "expired" ? (
                <dd className="mt-1 text-xs text-muted-foreground">
                  Closed after {formatDate(announcement.displayUntil)}.
                </dd>
              ) : announcement.displayUntil ? (
                <dd className="mt-1 text-xs text-muted-foreground">
                  Closes automatically after {formatDate(announcement.displayUntil)}.
                </dd>
              ) : null}
            </div>
          </dl>

          <article className="rounded-lg border border-border bg-card p-4">
            <div
              className="prose prose-sm max-w-none text-foreground [&_a]:text-primary [&_ol]:list-decimal [&_ul]:list-disc"
              dangerouslySetInnerHTML={{ __html: announcement.body }}
            />
          </article>

          {announcement.attachments.length > 0 ? (
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Attachments
              </p>
              <div className="mt-2 space-y-2">
                {announcement.attachments.map((attachment) => (
                  <Link
                    className="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted/60"
                    href={`/api/files/${attachment.fileId}/download`}
                    key={attachment.fileId}
                  >
                    Download {attachment.fileName}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No attachments.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
