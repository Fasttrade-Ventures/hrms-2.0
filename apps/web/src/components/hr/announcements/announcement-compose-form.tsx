"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createAnnouncementAction,
  updateAnnouncementAction,
  type AnnouncementActionState,
} from "@/app/(hr)/hr/announcements/actions";
import { AnnouncementAudienceFields } from "@/components/hr/announcements/announcement-audience-fields";
import { AnnouncementEditor } from "@/components/hr/announcements/announcement-editor";
import { AnnouncementFormField } from "@/components/hr/announcements/announcement-form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
  const [state, formAction, pending] = useActionState(action, initialState);
  const router = useRouter();
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

  useEffect(() => {
    if (!state.success) return;
    router.refresh();
    onSuccess?.();
  }, [onSuccess, router, state.success]);

  return (
    <form action={formAction} className="space-y-4" encType="multipart/form-data">
      {announcement ? <input name="announcementId" type="hidden" value={announcement.id} /> : null}
      <input name="isPinned" type="hidden" value={String(isPinned)} />

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
          hint="Headings, lists, and links supported."
          id="body"
          label="Message"
        >
          <AnnouncementEditor defaultValue={announcement?.body ?? ""} onChange={setBodyHtml} />
          <input name="body" type="hidden" value={bodyHtml} />
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

      <Card className="py-3" size="sm">
        <CardHeader className="border-b pb-3">
          <CardTitle>Attachments</CardTitle>
          <CardDescription>Optional PDF, JPG, or PNG up to 10 MB each.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 pt-3">
          {announcement?.attachments.length ? (
            <div className="space-y-2 text-sm text-muted-foreground">
              {announcement.attachments.map((attachment) => (
                <label className="flex items-center gap-2" key={attachment.fileId}>
                  <Checkbox name="removeAttachmentIds" value={attachment.fileId} />
                  <span>{attachment.fileName}</span>
                </label>
              ))}
              <p className="text-xs">Check files above to remove them on save.</p>
            </div>
          ) : null}
          <Input
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            className="cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium"
            multiple
            name="attachments"
            type="file"
          />
        </CardContent>
      </Card>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}

      <div className="flex justify-end border-t border-border pt-3">
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
  );
}
