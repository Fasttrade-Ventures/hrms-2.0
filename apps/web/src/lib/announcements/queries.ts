import {
  announcementMatchesAudience,
  isAnnouncementInDisplayWindow,
  type AnnouncementViewer,
} from "@/lib/announcements/audience";
import { announcementExcerpt, sanitizeAnnouncementHtml } from "@/lib/announcements/sanitize";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { getReadAnnouncementIds } from "./reads";

export type AnnouncementAttachment = {
  fileId: string;
  fileName: string;
};

export type AnnouncementRecord = {
  id: string;
  title: string;
  body: string;
  status: "draft" | "published";
  isPinned: boolean;
  postedAt: string | null;
  displayFrom: string | null;
  displayUntil: string | null;
  branchId: string | null;
  targetRoles: string[];
  targetDepartmentIds: string[];
  attachments: AnnouncementAttachment[];
  attachmentFileId: string | null;
  attachmentFileName: string | null;
  createdAt: string;
  updatedAt: string;
};

type AttachmentRow = {
  file_id: string;
  sort_order: number;
  file_objects:
    | { file_name: string; deleted_at: string | null }
    | Array<{ file_name: string; deleted_at: string | null }>
    | null;
};

type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  status: "draft" | "published";
  is_pinned: boolean;
  posted_at: string | null;
  display_from: string | null;
  display_until: string | null;
  branch_id: string | null;
  target_roles: string[] | null;
  target_department_ids: string[] | null;
  attachment_file_id: string | null;
  created_at: string;
  updated_at: string;
  file_objects?:
    | { file_name: string; deleted_at: string | null }
    | Array<{ file_name: string; deleted_at: string | null }>
    | null;
  announcement_attachments?: AttachmentRow[] | null;
};

function mapAttachments(rows: AttachmentRow[] | null | undefined): AnnouncementAttachment[] {
  return (rows ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => {
      const file = Array.isArray(row.file_objects) ? row.file_objects[0] : row.file_objects;
      if (!file || file.deleted_at) return null;
      return { fileId: row.file_id, fileName: file.file_name };
    })
    .filter((item): item is AnnouncementAttachment => Boolean(item));
}

function mapAnnouncementRow(row: AnnouncementRow): AnnouncementRecord {
  const junctionAttachments = mapAttachments(row.announcement_attachments);
  const legacyFile = Array.isArray(row.file_objects) ? row.file_objects[0] : row.file_objects;
  const attachments =
    junctionAttachments.length > 0
      ? junctionAttachments
      : legacyFile && !legacyFile.deleted_at && row.attachment_file_id
        ? [{ fileId: row.attachment_file_id, fileName: legacyFile.file_name }]
        : [];
  const first = attachments[0] ?? null;

  return {
    id: row.id,
    title: row.title,
    body: sanitizeAnnouncementHtml(row.body),
    status: row.status,
    isPinned: row.is_pinned ?? false,
    postedAt: row.posted_at,
    displayFrom: row.display_from,
    displayUntil: row.display_until,
    branchId: row.branch_id,
    targetRoles: row.target_roles ?? [],
    targetDepartmentIds: row.target_department_ids ?? [],
    attachments,
    attachmentFileId: first?.fileId ?? null,
    attachmentFileName: first?.fileName ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const announcementSelect =
  "id, title, body, status, is_pinned, posted_at, display_from, display_until, branch_id, target_roles, target_department_ids, attachment_file_id, created_at, updated_at, file_objects(file_name, deleted_at), announcement_attachments(sort_order, file_id, file_objects(file_name, deleted_at))";

function sortAnnouncements(rows: AnnouncementRecord[]): AnnouncementRecord[] {
  return rows.slice().sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    const aTime = a.postedAt ?? a.createdAt;
    const bTime = b.postedAt ?? b.createdAt;
    return bTime.localeCompare(aTime);
  });
}

export async function getAnnouncementViewer(input: {
  organizationId: string;
  employeeId: string;
  roles: string[];
}): Promise<AnnouncementViewer> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees")
    .select("branch_id, department_id")
    .eq("id", input.employeeId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return {
    branchId: data?.branch_id ?? null,
    departmentId: data?.department_id ?? null,
    roles: input.roles,
  };
}

function filterAnnouncementsForViewer(
  rows: AnnouncementRecord[],
  viewer: AnnouncementViewer,
  today: string,
): AnnouncementRecord[] {
  return rows.filter((row) => {
    if (!isAnnouncementInDisplayWindow(row, today)) return false;
    return announcementMatchesAudience(row, viewer);
  });
}

export async function listVisibleAnnouncements(input: {
  organizationId: string;
  viewer: AnnouncementViewer;
  limit?: number;
  pinnedOnly?: boolean;
}): Promise<AnnouncementRecord[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("announcements")
    .select(announcementSelect)
    .eq("organization_id", input.organizationId)
    .eq("status", "published")
    .order("posted_at", { ascending: false, nullsFirst: false });

  if (error) throw new Error(error.message);

  let filtered = sortAnnouncements(
    filterAnnouncementsForViewer(
      (data ?? []).map((row) => mapAnnouncementRow(row as AnnouncementRow)),
      input.viewer,
      today,
    ),
  );

  if (input.pinnedOnly) {
    filtered = filtered.filter((row) => row.isPinned);
  }

  return input.limit ? filtered.slice(0, input.limit) : filtered;
}

export async function getVisibleAnnouncement(input: {
  organizationId: string;
  announcementId: string;
  viewer: AnnouncementViewer;
}): Promise<AnnouncementRecord | null> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("announcements")
    .select(announcementSelect)
    .eq("organization_id", input.organizationId)
    .eq("id", input.announcementId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const announcement = mapAnnouncementRow(data as AnnouncementRow);
  if (!isAnnouncementInDisplayWindow(announcement, today)) return null;
  if (!announcementMatchesAudience(announcement, input.viewer)) return null;
  return announcement;
}

export async function canAccessAnnouncementAttachment(input: {
  organizationId: string;
  fileId: string;
  viewer: AnnouncementViewer;
}): Promise<boolean> {
  const admin = createAdminClient();

  const { data: link, error: linkError } = await admin
    .from("announcement_attachments")
    .select("announcement_id")
    .eq("organization_id", input.organizationId)
    .eq("file_id", input.fileId)
    .maybeSingle();

  let announcementId = link?.announcement_id as string | undefined;

  if (!announcementId) {
    const { data: legacy } = await admin
      .from("announcements")
      .select("id")
      .eq("organization_id", input.organizationId)
      .eq("attachment_file_id", input.fileId)
      .maybeSingle();
    announcementId = legacy?.id;
  }

  if (linkError || !announcementId) return false;

  const { data: announcement, error } = await admin
    .from("announcements")
    .select(
      "id, status, display_from, display_until, branch_id, target_roles, target_department_ids",
    )
    .eq("organization_id", input.organizationId)
    .eq("id", announcementId)
    .maybeSingle();

  if (error || !announcement) return false;

  const today = new Date().toISOString().slice(0, 10);
  const record: AnnouncementRecord = {
    id: announcement.id,
    title: "",
    body: "",
    status: announcement.status,
    isPinned: false,
    postedAt: null,
    displayFrom: announcement.display_from,
    displayUntil: announcement.display_until,
    branchId: announcement.branch_id,
    targetRoles: announcement.target_roles ?? [],
    targetDepartmentIds: announcement.target_department_ids ?? [],
    attachments: [],
    attachmentFileId: input.fileId,
    attachmentFileName: null,
    createdAt: "",
    updatedAt: "",
  };

  if (!isAnnouncementInDisplayWindow(record, today)) return false;
  return announcementMatchesAudience(record, input.viewer);
}

export function toAnnouncementListItem(
  announcement: AnnouncementRecord,
  options?: { isRead?: boolean },
) {
  return {
    id: announcement.id,
    title: announcement.title,
    excerpt: announcementExcerpt(announcement.body),
    postedAt: announcement.postedAt,
    displayFrom: announcement.displayFrom,
    isPinned: announcement.isPinned,
    isRead: options?.isRead ?? false,
    hasAttachment: announcement.attachments.length > 0,
    attachmentCount: announcement.attachments.length,
  };
}

export async function listDashboardAnnouncementItems(input: {
  organizationId: string;
  viewer: AnnouncementViewer;
  userId: string;
}) {
  const announcements = await listVisibleAnnouncements({
    organizationId: input.organizationId,
    viewer: input.viewer,
  });
  const readIds = await getReadAnnouncementIds(input.userId);
  const pinned = announcements
    .filter((row) => row.isPinned)
    .map((row) => toAnnouncementListItem(row, { isRead: readIds.has(row.id) }));
  const latest = announcements
    .filter((row) => !row.isPinned)
    .slice(0, 3)
    .map((row) => toAnnouncementListItem(row, { isRead: readIds.has(row.id) }));
  return { pinned, latest };
}
