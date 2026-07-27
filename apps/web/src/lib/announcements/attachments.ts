import type { AnnouncementAttachment } from "@/lib/announcements/queries";
import {
  assertAnnouncementUpload,
  hardDeleteOrganizationFile,
  uploadOrganizationFile,
} from "@/lib/files/storage";
import { createAdminClient } from "@/lib/supabase/admin";

type AttachmentRow = {
  file_id: string;
  sort_order: number;
  file_objects:
    | { file_name: string; deleted_at: string | null }
    | Array<{ file_name: string; deleted_at: string | null }>
    | null;
};

export function mapHrAttachments(rows: AttachmentRow[] | null | undefined): AnnouncementAttachment[] {
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

export async function uploadAnnouncementAttachments(input: {
  organizationId: string;
  announcementId: string;
  actorUserId: string;
  files: File[];
  startOrder?: number;
}): Promise<string | null> {
  if (input.files.length === 0) return null;

  const admin = createAdminClient();
  let firstFileId: string | null = null;
  let order = input.startOrder ?? 0;

  for (const file of input.files) {
    if (!(file instanceof File) || file.size === 0) continue;
    assertAnnouncementUpload(file);
    const body = new Uint8Array(await file.arrayBuffer());
    const fileId = await uploadOrganizationFile({
      organizationId: input.organizationId,
      category: "announcement-attachments",
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      body,
      uploadedByUserId: input.actorUserId,
    });

    const { error } = await admin.from("announcement_attachments").insert({
      organization_id: input.organizationId,
      announcement_id: input.announcementId,
      file_id: fileId,
      sort_order: order,
    });
    if (error) throw new Error(error.message);

    if (!firstFileId) firstFileId = fileId;
    order += 1;
  }

  return firstFileId;
}

export async function removeAnnouncementAttachments(input: {
  organizationId: string;
  announcementId: string;
  fileIds: string[];
  removeAll?: boolean;
}): Promise<void> {
  const admin = createAdminClient();
  let fileIds = input.fileIds;

  if (input.removeAll) {
    const { data } = await admin
      .from("announcement_attachments")
      .select("file_id")
      .eq("organization_id", input.organizationId)
      .eq("announcement_id", input.announcementId);
    fileIds = (data ?? []).map((row) => row.file_id);
  }

  for (const fileId of fileIds) {
    await admin
      .from("announcement_attachments")
      .delete()
      .eq("organization_id", input.organizationId)
      .eq("announcement_id", input.announcementId)
      .eq("file_id", fileId);
    await hardDeleteOrganizationFile(fileId);
  }
}

export async function syncPrimaryAttachmentFileId(
  organizationId: string,
  announcementId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("announcement_attachments")
    .select("file_id")
    .eq("organization_id", organizationId)
    .eq("announcement_id", announcementId)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  const primaryId = data?.file_id ?? null;
  await admin
    .from("announcements")
    .update({ attachment_file_id: primaryId })
    .eq("organization_id", organizationId)
    .eq("id", announcementId);

  return primaryId;
}

export async function deleteAllAnnouncementAttachments(
  organizationId: string,
  announcementId: string,
): Promise<void> {
  await removeAnnouncementAttachments({
    organizationId,
    announcementId,
    fileIds: [],
    removeAll: true,
  });
}
