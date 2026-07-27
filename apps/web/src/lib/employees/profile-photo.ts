import { createAdminClient } from "@/lib/supabase/admin";

export const EMPLOYEE_PHOTOS_BUCKET = "employee-photos";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 2 * 1024 * 1024;

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) {
    throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  }
  return organizationId;
}

function extensionForContentType(contentType: string): string {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

export function getEmployeeProfilePhotoUrl(path: string | null | undefined): string | null {
  if (!path?.trim()) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  return `${supabaseUrl}/storage/v1/object/public/${EMPLOYEE_PHOTOS_BUCKET}/${path}`;
}

export function validateProfilePhotoFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Photo must be a JPEG, PNG, or WebP image.";
  }
  if (file.size > MAX_BYTES) {
    return "Photo must be 2 MB or smaller.";
  }
  return null;
}

export async function uploadEmployeeProfilePhoto(
  employeeId: string,
  file: File,
): Promise<string> {
  const validationError = validateProfilePhotoFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const organizationId = getOrganizationId();
  const admin = createAdminClient();
  const extension = extensionForContentType(file.type);
  const path = `${organizationId}/${employeeId}/avatar.${extension}`;
  const body = new Uint8Array(await file.arrayBuffer());

  const { error } = await admin.storage.from(EMPLOYEE_PHOTOS_BUCKET).upload(path, body, {
    contentType: file.type,
    upsert: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  return path;
}

export async function deleteEmployeeProfilePhoto(path: string | null | undefined): Promise<void> {
  if (!path?.trim()) return;

  const admin = createAdminClient();
  const { error } = await admin.storage.from(EMPLOYEE_PHOTOS_BUCKET).remove([path]);
  if (error) {
    throw new Error(error.message);
  }
}

export async function setEmployeeProfilePhotoPath(
  employeeId: string,
  path: string | null,
): Promise<void> {
  const admin = createAdminClient();
  const organizationId = getOrganizationId();

  const { error } = await admin
    .from("employee_profiles")
    .update({ profile_photo_path: path })
    .eq("employee_id", employeeId)
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function resolveEmployeeProfilePhoto(
  employeeId: string,
  formData: FormData,
  currentPath: string | null,
  removeRequested: boolean,
): Promise<string | null> {
  const file = formData.get("profilePhoto");
  const hasNewFile = file instanceof File && file.size > 0;

  if (removeRequested && currentPath) {
    await deleteEmployeeProfilePhoto(currentPath);
    if (!hasNewFile) {
      return null;
    }
  }

  if (hasNewFile) {
    if (currentPath && !removeRequested) {
      await deleteEmployeeProfilePhoto(currentPath);
    }
    return uploadEmployeeProfilePhoto(employeeId, file);
  }

  if (removeRequested) {
    return null;
  }

  return currentPath;
}
