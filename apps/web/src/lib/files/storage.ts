import { createHash } from "node:crypto";

import { StubR2StorageAdapter } from "@hrms/platform";

import { createAdminClient } from "@/lib/supabase/admin";

const adapter = new StubR2StorageAdapter();

export async function uploadOrganizationFile(input: {
  organizationId: string;
  category: string;
  fileName: string;
  contentType: string;
  body: Uint8Array;
  uploadedByUserId: string;
}): Promise<string> {
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
  return adapter.getSignedDownloadUrl({ bucket: data.bucket, key: data.storage_key });
}
