"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createAnnouncementAction,
  updateAnnouncementAction,
  type AnnouncementActionState,
} from "@/app/(hr)/hr/announcements/actions";
import { AnnouncementAttachmentUpload } from "@/components/hr/announcements/announcement-attachment-upload";
import { AnnouncementAudienceFields } from "@/components/hr/announcements/announcement-audience-fields";
import { AnnouncementEditor } from "@/components/hr/announcements/announcement-editor";
import { AnnouncementFormField } from "@/components/hr/announcements/announcement-form-field";
import {
  AnnouncementPreviewDialog,
  type AnnouncementPreviewData,
} from "@/components/hr/announcements/announcement-preview-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  getAnnouncementDisplayStatus,
  summarizeAnnouncementAudience,
} from "@/lib/announcements/audience";
import type { HrAnnouncementRow } from "@/lib/hr/announcements";

type Option = { id: string; name: string };

type AnnouncementComposeFormProps = {
  branches: Option[];
  departments: Option[];
  announcement?: HrAnnouncementRow;
  onSuccess?: () => void;
};

const initialState: AnnouncementActionState = {};

export function AnnouncementComposeForm({
  branches,
  departments,
  announcement,
  onSuccess,
}: AnnouncementComposeFormProps) {
  const action = announcement ? updateAnnouncementAction : createAnnouncementAction;
  const [state, formAction] = useActionState(action, initialState);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [publishMode, setPublishMode] = useState<"draft" | "publish_now" | "schedule">(
    announcement?.status === "draft"
      ? "draft"
      : announcement?.displayFrom &&
          announcement.displayFrom > new Date().toISOString().slice(0, 10)
        ? "schedule"
        : "publish_now",
  );
  const [isPinned, setIsPinned] = useState(announcement?.isPinned ?? false);
  const [bodyHtml, setBodyHtml] = useState(announcement?.body ?? "");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<AnnouncementPreviewData | null>(null);

  useEffect(() => {
    if (!state.success) return;
    router.refresh();
    onSuccess?.();
  }, [onSuccess, router, state.success]);

  function buildPreviewData(): AnnouncementPreviewData | null {
    const form = formRef.current;
    if (!form) return null;

    const formData = new FormData(form);
    const title = String(formData.get("title") ?? "").trim();
    const displayFrom = String(formData.get("displayFrom") ?? "").trim() || null;
    const displayUntil = String(formData.get("displayUntil") ?? "").trim() || null;
    const branchId = String(formData.get("branchId") ?? "").trim();
    const targetRoles = formData.getAll("targetRoles").map((value) => String(value));
    const targetDepartmentIds = formData
      .getAll("targetDepartmentIds")
      .map((value) => String(value));
    const today = new Date().toISOString().slice(0, 10);
    const status = publishMode === "draft" ? "draft" : "published";

    const branchName = branchId
      ? branches.find((branch) => branch.id === branchId)?.name ?? null
      : null;
    const departmentNames = targetDepartmentIds
      .map((id) => departments.find((department) => department.id === id)?.name)
      .filter((name): name is string => Boolean(name));

    const existingAttachments =
      announcement?.attachments
        .filter((attachment) => !removedAttachmentIds.includes(attachment.fileId))
        .map((attachment) => ({ fileName: attachment.fileName })) ?? [];

    return {
      title,
      body: bodyHtml,
      audienceSummary: summarizeAnnouncementAudience({
        branchName,
        departmentNames,
        targetRoles,
      }),
      displayStatus: getAnnouncementDisplayStatus(
        { status, displayFrom, displayUntil },
        today,
      ),
      displayFrom,
      displayUntil,
      attachments: [
        ...existingAttachments,
        ...selectedFiles.map((file) => ({ fileName: file.name, isNew: true })),
      ],
    };
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.delete("attachments");
    for (const file of selectedFiles) {
      formData.append("attachments", file);
    }
    for (const fileId of removedAttachmentIds) {
      formData.append("removeAttachmentIds", fileId);
    }
    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <>
      <form
        className="space-y-4"
        encType="multipart/form-data"
        onSubmit={handleSubmit}
        ref={formRef}
      >
        {announcement ? <input name="announcementId" type="hidden" value={announcement.id} /> : null}
        <input name="isPinned" type="hidden" value={String(isPinned)} />
        <input name="publishMode" type="hidden" value={publishMode} />

        <div className="grid gap-3">
          <AnnouncementFormField id="title" label="Title">
            <Input
              defaultValue={announcement?.title}
              id="title"
              name="title"
              placeholder="Announcement title"
              required
            />
          </AnnouncementFormField>

          <AnnouncementFormField
            hint="Headings, lists, links, and attachments below."
            id="body"
            label="Message"
          >
            <AnnouncementEditor defaultValue={announcement?.body ?? ""} onChange={setBodyHtml} />
            <input name="body" type="hidden" value={bodyHtml} />
            <div className="mt-4">
              <AnnouncementAttachmentUpload
                existingAttachments={announcement?.attachments ?? []}
                onFilesChange={setSelectedFiles}
                onRemoveExistingChange={setRemovedAttachmentIds}
              />
            </div>
          </AnnouncementFormField>
        </div>

        <Card className="py-3" size="sm">
          <CardHeader className="border-b pb-3">
            <CardTitle>Audience</CardTitle>
            <CardDescription>Leave filters empty to reach everyone in the organization.</CardDescription>
          </CardHeader>
          <CardContent className="pt-3">
            <AnnouncementAudienceFields
              branches={branches}
              defaultBranchId={announcement?.branchId}
              defaultDepartmentIds={announcement?.targetDepartmentIds ?? []}
              defaultRoles={announcement?.targetRoles ?? []}
              departments={departments}
            />
          </CardContent>
        </Card>

        <Card className="py-3" size="sm">
          <CardHeader className="border-b pb-3">
            <CardTitle>Publishing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-3">
            <ToggleGroup
              className="flex w-full flex-wrap"
              onValueChange={(value) => {
                const next = value[0];
                if (next === "draft" || next === "publish_now" || next === "schedule") {
                  setPublishMode(next);
                }
              }}
              spacing={0}
              value={[publishMode]}
              variant="outline"
            >
              <ToggleGroupItem className="flex-1 text-xs" value="draft">
                Save draft
              </ToggleGroupItem>
              <ToggleGroupItem className="flex-1 text-xs" value="publish_now">
                Publish now
              </ToggleGroupItem>
              <ToggleGroupItem className="flex-1 text-xs" value="schedule">
                Schedule
              </ToggleGroupItem>
            </ToggleGroup>

            {publishMode !== "draft" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {publishMode === "schedule" || announcement?.displayFrom ? (
                  <AnnouncementFormField label="Visible from">
                    <Input
                      defaultValue={announcement?.displayFrom ?? ""}
                      name="displayFrom"
                      required={publishMode === "schedule"}
                      type="date"
                    />
                  </AnnouncementFormField>
                ) : (
                  <input name="displayFrom" type="hidden" value="" />
                )}
                <AnnouncementFormField
                  hint="Optional. Status becomes Closed after this date."
                  label="Visible until"
                >
                  <Input
                    defaultValue={announcement?.displayUntil ?? ""}
                    name="displayUntil"
                    type="date"
                  />
                </AnnouncementFormField>
              </div>
            ) : null}
            {publishMode === "schedule" ? (
              <p className="text-xs text-muted-foreground">
                Notifications are sent when the visible-from date is reached (daily cron).
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="py-3" size="sm">
          <CardHeader className="border-b pb-3">
            <CardTitle>Options</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={isPinned}
                onCheckedChange={(checked) => setIsPinned(checked === true)}
              />
              <span>Pin to dashboards (shows on employee, manager, and HR home)</span>
            </label>
          </CardContent>
        </Card>

        {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        {state.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}

        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
          <Button
            onClick={() => {
              setPreviewData(buildPreviewData());
              setPreviewOpen(true);
            }}
            type="button"
            variant="outline"
          >
            Preview
          </Button>
          <Button disabled={pending} type="submit">
            {pending
              ? "Saving…"
              : announcement
                ? "Update announcement"
                : publishMode === "draft"
                  ? "Save draft"
                  : publishMode === "schedule"
                    ? "Schedule announcement"
                    : "Publish announcement"}
          </Button>
        </div>
      </form>

      <AnnouncementPreviewDialog
        onOpenChange={setPreviewOpen}
        open={previewOpen}
        preview={previewData}
      />
    </>
  );
}
