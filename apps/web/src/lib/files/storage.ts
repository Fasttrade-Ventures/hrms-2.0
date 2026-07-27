import { createHash } from "node:crypto";

import { S3R2StorageAdapter, type R2StorageAdapter } from "@hrms/platform";

import { createAdminClient } from "@/lib/supabase/admin";

let adapterInstance: R2StorageAdapter | null = null;

function getStorageAdapter(): R2StorageAdapter {
  if (!adapterInstance) {
    adapterInstance = new S3R2StorageAdapter();
  }
  return adapterInstance;
}

export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

export const DOCUMENT_ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const DOCUMENT_ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"];

export const ANNOUNCEMENT_ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

export const ANNOUNCEMENT_ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

export function assertDocumentUpload(file: { name: string; type: string; size: number }): void {
  if (file.size > DOCUMENT_MAX_BYTES) {
    throw new Error("File exceeds the 10 MB limit.");
  }

  const extension = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase() : "";
  if (!DOCUMENT_ALLOWED_EXTENSIONS.includes(extension)) {
    throw new Error("File type not allowed. Use PDF, JPG, PNG, DOC, or DOCX.");
  }

  if (file.type && !DOCUMENT_ALLOWED_CONTENT_TYPES.has(file.type)) {
    throw new Error("File type not allowed. Use PDF, JPG, PNG, DOC, or DOCX.");
  }
}

export function assertAnnouncementUpload(file: { name: string; type: string; size: number }): void {
  if (file.size > DOCUMENT_MAX_BYTES) {
    throw new Error("File exceeds the 10 MB limit.");
  }

  const extension = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase() : "";
  if (!ANNOUNCEMENT_ALLOWED_EXTENSIONS.includes(extension)) {
    throw new Error("File type not allowed. Use PDF, JPG, or PNG.");
  }

  if (file.type && !ANNOUNCEMENT_ALLOWED_CONTENT_TYPES.has(file.type)) {
    throw new Error("File type not allowed. Use PDF, JPG, or PNG.");
  }
}

export async function uploadOrganizationFile(input: {
  organizationId: string;
  category: string;
  fileName: string;
  contentType: string;
  body: Uint8Array;
  uploadedByUserId: string;
}): Promise<string> {
  const adapter = getStorageAdapter();
  const ref = await adapter.putObject({
    organizationId: input.organizationId,
    category: input.category,
    fileName: input.fileName,
    contentType: input.contentType,
    body: input.body,
  });

  const sha256 = createHash("sha256").update(input.body).digest("hex");
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("file_objects")
    .insert({
      organization_id: input.organizationId,
      category: input.category,
      storage_key: ref.key,
      bucket: ref.bucket,
      file_name: input.fileName,
      content_type: input.contentType,
      byte_size: input.body.byteLength,
      sha256,
      uploaded_by_user_id: input.uploadedByUserId,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to record file.");
  return data.id;
}

export async function getSignedDownloadUrl(fileId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("file_objects")
    .select("bucket, storage_key")
    .eq("id", fileId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) return null;
  return getStorageAdapter().getSignedDownloadUrl({ bucket: data.bucket, key: data.storage_key });
}

export async function hardDeleteOrganizationFile(fileId: string): Promise<void> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("file_objects")
    .select("bucket, storage_key")
    .eq("id", fileId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return;

  await getStorageAdapter().deleteObject({ bucket: data.bucket, key: data.storage_key });

  const { error: deleteError } = await admin.from("file_objects").delete().eq("id", fileId);
  if (deleteError) throw new Error(deleteError.message);
}
