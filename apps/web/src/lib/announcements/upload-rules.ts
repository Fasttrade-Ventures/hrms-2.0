export const ANNOUNCEMENT_MAX_BYTES = 10 * 1024 * 1024;

export const ANNOUNCEMENT_ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"] as const;

export const ANNOUNCEMENT_ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

export function validateAnnouncementFile(file: { name: string; type: string; size: number }): string | null {
  if (file.size > ANNOUNCEMENT_MAX_BYTES) {
    return "File exceeds the 10 MB limit.";
  }

  const extension = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
    : "";
  if (!ANNOUNCEMENT_ALLOWED_EXTENSIONS.includes(extension as (typeof ANNOUNCEMENT_ALLOWED_EXTENSIONS)[number])) {
    return "File type not allowed. Use PDF, JPG, or PNG.";
  }

  if (file.type && !ANNOUNCEMENT_ALLOWED_CONTENT_TYPES.has(file.type)) {
    return "File type not allowed. Use PDF, JPG, or PNG.";
  }

  return null;
}
