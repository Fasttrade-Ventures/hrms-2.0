"use client";

import { formatDate } from "@/components/employee/employee-shared";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { HrAnnouncementRow } from "@/lib/hr/announcements";

export type AnnouncementPreviewData = {
  title: string;
  body: string;
  audienceSummary: string;
  displayStatus: HrAnnouncementRow["displayStatus"];
  displayFrom: string | null;
  displayUntil: string | null;
  attachments: Array<{ fileName: string; isNew?: boolean }>;
};

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

function formatDisplayWindow(preview: AnnouncementPreviewData): string {
  if (!preview.displayFrom && !preview.displayUntil) return "Always on";
  const from = preview.displayFrom ? formatDate(preview.displayFrom) : "Now";
  const until = preview.displayUntil ? formatDate(preview.displayUntil) : "Open";
  return `${from} → ${until}`;
}

export function AnnouncementPreviewDialog({
  open,
  onOpenChange,
  preview,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: AnnouncementPreviewData | null;
}) {
  if (!preview) return null;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Preview announcement</DialogTitle>
          <DialogDescription>
            This is how employees and managers will see the announcement after it goes live.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant[preview.displayStatus]}>
              {statusLabels[preview.displayStatus]}
            </Badge>
            <span className="text-sm text-muted-foreground">{preview.title || "Untitled announcement"}</span>
          </div>

          <dl className="grid gap-3 rounded-lg border border-border bg-muted/20 p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Audience
              </dt>
              <dd className="mt-1 text-foreground">{preview.audienceSummary}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Display window
              </dt>
              <dd className="mt-1 text-foreground">{formatDisplayWindow(preview)}</dd>
            </div>
          </dl>

          <article className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-lg font-semibold text-foreground">
              {preview.title || "Untitled announcement"}
            </h3>
            <div
              className="prose prose-sm mt-4 max-w-none text-foreground [&_a]:text-primary [&_ol]:list-decimal [&_ul]:list-disc"
              dangerouslySetInnerHTML={{
                __html: preview.body || "<p><em>No message content yet.</em></p>",
              }}
            />
          </article>

          {preview.attachments.length > 0 ? (
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Attachments
              </p>
              <div className="mt-2 space-y-2">
                {preview.attachments.map((attachment, index) => (
                  <div
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                    key={`${attachment.fileName}-${index}`}
                  >
                    {attachment.fileName}
                    {attachment.isNew ? (
                      <span className="ml-2 text-xs text-muted-foreground">(new)</span>
                    ) : null}
                  </div>
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
