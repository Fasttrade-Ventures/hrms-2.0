import type { AnnouncementFormInput } from "@hrms/validation";

import {
  deleteAllAnnouncementAttachments,
  mapHrAttachments,
  removeAnnouncementAttachments,
  syncPrimaryAttachmentFileId,
  uploadAnnouncementAttachments,
} from "@/lib/announcements/attachments";
import type { AnnouncementAttachment } from "@/lib/announcements/queries";
import {
  getAnnouncementDisplayStatus,
  summarizeAnnouncementAudience,
} from "@/lib/announcements/audience";
import { announcementBodyHasContent, sanitizeAnnouncementHtml } from "@/lib/announcements/sanitize";
import { queueAnnouncementPublishedNotifications } from "@/lib/announcements/publish-notifications";
import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export type HrAnnouncementRow = {
  id: string;
  title: string;
  body: string;
  status: "draft" | "published";
  displayStatus: "draft" | "scheduled" | "active" | "expired";
  postedAt: string | null;
  displayFrom: string | null;
  displayUntil: string | null;
  branchId: string | null;
  branchName: string | null;
  targetRoles: string[];
  targetDepartmentIds: string[];
  departmentNames: string[];
  audienceSummary: string;
  isPinned: boolean;
  attachments: AnnouncementAttachment[];
  attachmentFileId: string | null;
  attachmentFileName: string | null;
  createdAt: string;
  updatedAt: string;
};

type DbAnnouncementRow = {
  id: string;
  title: string;
  body: string;
  status: "draft" | "published";
  posted_at: string | null;
  display_from: string | null;
  display_until: string | null;
  branch_id: string | null;
  target_roles: string[] | null;
  target_department_ids: string[] | null;
  attachment_file_id: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  branches: { name: string } | Array<{ name: string }> | null;
  file_objects?:
    | { file_name: string; deleted_at: string | null }
    | Array<{ file_name: string; deleted_at: string | null }>
    | null;
  announcement_attachments?:
    | Array<{
        file_id: string;
        sort_order: number;
        file_objects:
          | { file_name: string; deleted_at: string | null }
          | Array<{ file_name: string; deleted_at: string | null }>
          | null;
      }>
    | null;
};

function resolvePublishFields(input: AnnouncementFormInput, wasDraft: boolean, existingPostedAt: string | null) {
  const today = new Date().toISOString().slice(0, 10);
  const sanitizedBody = sanitizeAnnouncementHtml(input.body);

  if (!announcementBodyHasContent(sanitizedBody)) {
    throw new Error("Message is required.");
  }

  if (input.publishMode === "draft") {
    return {
      status: "draft" as const,
      postedAt: existingPostedAt,
      displayFrom: input.displayFrom ?? null,
      displayUntil: input.displayUntil ?? null,
      body: sanitizedBody,
      notify: false,
    };
  }

  const postedAt = existingPostedAt ?? new Date().toISOString();
  const displayFrom =
    input.publishMode === "schedule"
      ? input.displayFrom ?? today
      : input.displayFrom ?? null;
  const displayUntil = input.displayUntil ?? null;

  return {
    status: "published" as const,
    postedAt,
    displayFrom,
    displayUntil,
    body: sanitizedBody,
    notify: wasDraft || !existingPostedAt,
  };
}

export async function listHrAnnouncements(): Promise<HrAnnouncementRow[]> {
  await requireRole("hr_administrator");
  const organizationId = getOrganizationId();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("announcements")
    .select(
      "id, title, body, status, is_pinned, posted_at, display_from, display_until, branch_id, target_roles, target_department_ids, attachment_file_id, created_at, updated_at, branches(name), file_objects(file_name, deleted_at), announcement_attachments(sort_order, file_id, file_objects(file_name, deleted_at))",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const departmentIds = new Set<string>();
  for (const row of data ?? []) {
    for (const id of row.target_department_ids ?? []) {
      departmentIds.add(id);
    }
  }

  const departmentNameMap = new Map<string, string>();
  if (departmentIds.size > 0) {
    const { data: departments } = await supabase
      .from("departments")
      .select("id, name")
      .in("id", [...departmentIds]);

    for (const department of departments ?? []) {
      departmentNameMap.set(department.id, department.name);
    }
  }

  return (data ?? []).map((row) => {
    const typed = row as DbAnnouncementRow;
    const branch = Array.isArray(typed.branches) ? typed.branches[0] : typed.branches;
    const attachments = mapHrAttachments(typed.announcement_attachments);
    const legacyFile = Array.isArray(typed.file_objects) ? typed.file_objects[0] : typed.file_objects;
    const resolvedAttachments =
      attachments.length > 0
        ? attachments
        : legacyFile && !legacyFile.deleted_at && typed.attachment_file_id
          ? [{ fileId: typed.attachment_file_id, fileName: legacyFile.file_name }]
          : [];
    const first = resolvedAttachments[0] ?? null;
    const targetDepartmentIds = typed.target_department_ids ?? [];
    const departmentNames = targetDepartmentIds
      .map((id) => departmentNameMap.get(id))
      .filter((name): name is string => Boolean(name));

    return {
      id: typed.id,
      title: typed.title,
      body: sanitizeAnnouncementHtml(typed.body),
      status: typed.status,
      displayStatus: getAnnouncementDisplayStatus(
        {
          status: typed.status,
          displayFrom: typed.display_from,
          displayUntil: typed.display_until,
        },
        today,
      ),
      postedAt: typed.posted_at,
      displayFrom: typed.display_from,
      displayUntil: typed.display_until,
      branchId: typed.branch_id,
      branchName: branch?.name ?? null,
      targetRoles: typed.target_roles ?? [],
      targetDepartmentIds,
      departmentNames,
      audienceSummary: summarizeAnnouncementAudience({
        branchName: branch?.name ?? null,
        departmentNames,
        targetRoles: typed.target_roles ?? [],
      }),
      isPinned: typed.is_pinned ?? false,
      attachments: resolvedAttachments,
      attachmentFileId: first?.fileId ?? null,
      attachmentFileName: first?.fileName ?? null,
      createdAt: typed.created_at,
      updatedAt: typed.updated_at,
    };
  });
}

export async function getHrAnnouncement(announcementId: string): Promise<HrAnnouncementRow | null> {
  const rows = await listHrAnnouncements();
  return rows.find((row) => row.id === announcementId) ?? null;
}

export async function createAnnouncement(input: {
  form: AnnouncementFormInput;
  actorUserId: string;
  attachments?: File[];
}): Promise<string> {
  await requireRole("hr_administrator");
  const organizationId = getOrganizationId();
  const supabase = await createClient();

  const publishFields = resolvePublishFields(input.form, true, null);

  const { data, error } = await supabase
    .from("announcements")
    .insert({
      organization_id: organizationId,
      title: input.form.title.trim(),
      body: publishFields.body,
      status: publishFields.status,
      posted_at: publishFields.postedAt,
      display_from: publishFields.displayFrom,
      display_until: publishFields.displayUntil,
      branch_id: input.form.branchId ?? null,
      target_roles: input.form.targetRoles,
      target_department_ids: input.form.targetDepartmentIds,
      is_pinned: input.form.isPinned,
      attachment_file_id: null,
      created_by_user_id: input.actorUserId,
    })
    .select("id, posted_at")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create announcement.");

  await uploadAnnouncementAttachments({
    organizationId,
    announcementId: data.id,
    actorUserId: input.actorUserId,
    files: input.attachments ?? [],
  });
  await syncPrimaryAttachmentFileId(organizationId, data.id);

  if (publishFields.notify && publishFields.postedAt) {
    await queueAnnouncementPublishedNotifications({
      organizationId,
      announcementId: data.id,
      title: input.form.title.trim(),
      audience: {
        branchId: input.form.branchId ?? null,
        targetRoles: input.form.targetRoles,
        targetDepartmentIds: input.form.targetDepartmentIds,
      },
      postedAt: publishFields.postedAt,
    });
  }

  return data.id;
}

export async function updateAnnouncement(input: {
  announcementId: string;
  form: AnnouncementFormInput;
  actorUserId: string;
  attachments?: File[];
}): Promise<void> {
  await requireRole("hr_administrator");
  const organizationId = getOrganizationId();
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: existing, error: existingError } = await supabase
    .from("announcements")
    .select("id, status, posted_at")
    .eq("organization_id", organizationId)
    .eq("id", input.announcementId)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (!existing) throw new Error("Announcement not found.");

  const wasDraft = existing.status === "draft";
  const publishFields = resolvePublishFields(
    input.form,
    wasDraft,
    existing.posted_at,
  );

  if (input.form.removeAttachment) {
    await deleteAllAnnouncementAttachments(organizationId, input.announcementId);
  } else if (input.form.removeAttachmentIds.length > 0) {
    await removeAnnouncementAttachments({
      organizationId,
      announcementId: input.announcementId,
      fileIds: input.form.removeAttachmentIds,
    });
  }

  const { count } = await admin
    .from("announcement_attachments")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("announcement_id", input.announcementId);

  await uploadAnnouncementAttachments({
    organizationId,
    announcementId: input.announcementId,
    actorUserId: input.actorUserId,
    files: input.attachments ?? [],
    startOrder: count ?? 0,
  });

  const primaryId = await syncPrimaryAttachmentFileId(organizationId, input.announcementId);

  const { error } = await admin
    .from("announcements")
    .update({
      title: input.form.title.trim(),
      body: publishFields.body,
      status: publishFields.status,
      posted_at: publishFields.postedAt,
      display_from: publishFields.displayFrom,
      display_until: publishFields.displayUntil,
      branch_id: input.form.branchId ?? null,
      target_roles: input.form.targetRoles,
      target_department_ids: input.form.targetDepartmentIds,
      is_pinned: input.form.isPinned,
      attachment_file_id: primaryId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.announcementId)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);

  if (publishFields.notify && publishFields.postedAt) {
    await queueAnnouncementPublishedNotifications({
      organizationId,
      announcementId: input.announcementId,
      title: input.form.title.trim(),
      audience: {
        branchId: input.form.branchId ?? null,
        targetRoles: input.form.targetRoles,
        targetDepartmentIds: input.form.targetDepartmentIds,
      },
      postedAt: publishFields.postedAt,
    });
  }
}

export async function deleteAnnouncement(announcementId: string): Promise<void> {
  await requireRole("hr_administrator");
  const organizationId = getOrganizationId();
  const admin = createAdminClient();

  const { data: existing, error: existingError } = await admin
    .from("announcements")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("id", announcementId)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (!existing) throw new Error("Announcement not found.");

  await deleteAllAnnouncementAttachments(organizationId, announcementId);

  const { error } = await admin
    .from("announcements")
    .delete()
    .eq("id", announcementId)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);
}
