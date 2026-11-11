import {
  assertAnnouncementUpload,
  fetchOrganizationFileBytes,
  hardDeleteOrganizationFile,
  uploadOrganizationFile,
} from "@/lib/files/storage";
import { createAdminClient } from "@/lib/supabase/admin";

export const LETTERHEAD_CATEGORY = "letter_letterhead";

/** Letterhead must be a PNG/JPG image (announcement helper also allows PDF, which we reject). */
export function assertLetterheadUpload(file: { name: string; type: string; size: number }): void {
  assertAnnouncementUpload(file);
  const lower = file.name.toLowerCase();
  const imageName = lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg");
  const imageType = !file.type || file.type === "image/png" || file.type === "image/jpeg";
  if (!imageName || !imageType) {
    throw new Error("Letterhead must be a PNG or JPG image.");
  }
}

export async function uploadLetterheadFile(input: {
  organizationId: string;
  file: File;
  actorUserId: string | null;
}): Promise<string> {
  assertLetterheadUpload(input.file);
  const lower = input.file.name.toLowerCase();
  return uploadOrganizationFile({
    organizationId: input.organizationId,
    category: LETTERHEAD_CATEGORY,
    fileName: input.file.name,
    contentType: lower.endsWith(".png") ? "image/png" : "image/jpeg",
    body: new Uint8Array(await input.file.arrayBuffer()),
    uploadedByUserId: input.actorUserId,
  });
}

export async function getOrganizationLetterheadFileId(organizationId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organizations")
    .select("letterhead_file_id")
    .eq("id", organizationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.letterhead_file_id as string | null | undefined) ?? null;
}

/** Sets (or clears with null) the org default letterhead and removes the previous file. */
export async function setOrganizationLetterhead(
  organizationId: string,
  fileId: string | null,
): Promise<void> {
  const admin = createAdminClient();
  const previous = await getOrganizationLetterheadFileId(organizationId);
  const { error } = await admin
    .from("organizations")
    .update({ letterhead_file_id: fileId })
    .eq("id", organizationId);
  if (error) throw new Error(error.message);
  if (previous && previous !== fileId) {
    await hardDeleteOrganizationFile(previous).catch(() => undefined);
  }
}

/** Template override → organization default → none. Unreadable files fall through. */
export async function resolveLetterheadBytes(input: {
  organizationId: string;
  templateLetterheadFileId?: string | null;
}): Promise<Uint8Array | null> {
  if (input.templateLetterheadFileId) {
    const bytes = await fetchOrganizationFileBytes(input.templateLetterheadFileId);
    if (bytes) return bytes;
  }
  const orgFileId = await getOrganizationLetterheadFileId(input.organizationId);
  if (orgFileId) return fetchOrganizationFileBytes(orgFileId);
  return null;
}
