"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { deleteAnnouncementAction } from "@/app/(hr)/hr/announcements/actions";
import { AnnouncementComposeForm } from "@/components/hr/announcements/announcement-compose-form";
import { AnnouncementViewDialog } from "@/components/hr/announcements/announcement-view-dialog";
import { formatDateTime } from "@/components/employee/employee-shared";
import { HrTableCard } from "@/components/hr/hr-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { HrAnnouncementRow } from "@/lib/hr/announcements";

type Option = { id: string; name: string };

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

export function AnnouncementTable({
  announcements,
  branches,
  departments,
  initialViewId,
}: {
  announcements: HrAnnouncementRow[];
  branches: Option[];
  departments: Option[];
  initialViewId?: string | null;
}) {
  const [viewing, setViewing] = useState<HrAnnouncementRow | null>(null);
  const [editing, setEditing] = useState<HrAnnouncementRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!initialViewId) return;
    const match = announcements.find((item) => item.id === initialViewId);
    if (match) setViewing(match);
  }, [announcements, initialViewId]);

  return (
    <>
      <HrTableCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Pinned</th>
                <th className="px-4 py-3 font-medium">Audience</th>
                <th className="px-4 py-3 font-medium">Window</th>
                <th className="px-4 py-3 font-medium">Attachment</th>
                <th className="px-4 py-3 font-medium">Posted</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {announcements.map((item) => (
                <tr className="border-b border-border/70" key={item.id}>
                  <td className="px-4 py-3 font-medium text-foreground">{item.title}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[item.displayStatus]}>
                      {statusLabels[item.displayStatus]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.isPinned ? "Yes" : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{item.audienceSummary}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.displayFrom || item.displayUntil
                      ? `${item.displayFrom ?? "Now"} → ${item.displayUntil ?? "Open"}`
                      : "Always on"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.attachments.length > 0 ? (
                      <span>
                        {item.attachments.length === 1 && item.attachments[0] ? (
                          <a
                            className="text-primary hover:underline"
                            href={`/api/files/${item.attachments[0].fileId}/download`}
                          >
                            {item.attachments[0].fileName}
                          </a>
                        ) : (
                          `${item.attachments.length} files`
                        )}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.postedAt ? formatDateTime(item.postedAt) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button onClick={() => setViewing(item)} size="sm" type="button" variant="outline">
                        View
                      </Button>
                      <Button onClick={() => setEditing(item)} size="sm" type="button" variant="outline">
                        Edit
                      </Button>
                      <Button
                        disabled={deletingId === item.id}
                        onClick={() =>
                          startTransition(async () => {
                            if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) {
                              return;
                            }
                            setDeletingId(item.id);
                            await deleteAnnouncementAction(item.id);
                            setDeletingId(null);
                            router.refresh();
                          })
                        }
                        size="sm"
                        type="button"
                        variant="destructive"
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </HrTableCard>

      <AnnouncementViewDialog
        announcement={viewing}
        onOpenChange={(open) => {
          if (!open) {
            setViewing(null);
            if (initialViewId) router.replace("/hr/announcements");
          }
        }}
        open={Boolean(viewing)}
      />

      <Dialog onOpenChange={(open) => !open && setEditing(null)} open={Boolean(editing)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit announcement</DialogTitle>
          </DialogHeader>
          {editing ? (
            <AnnouncementComposeForm
              announcement={editing}
              branches={branches}
              departments={departments}
              key={editing.id}
              onSuccess={() => setEditing(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
