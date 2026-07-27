"use server";

import { revalidatePath } from "next/cache";

import { announcementFormSchema, announcementTargetRoleSchema } from "@hrms/validation";

import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";
import {
  createAnnouncement,
  deleteAnnouncement,
  updateAnnouncement,
} from "@/lib/hr/announcements";
import { markAnnouncementRead } from "@/lib/announcements/reads";

export type AnnouncementActionState = {
  error?: string;
  success?: string;
};

function parseAnnouncementForm(formData: FormData) {
  const targetRoles = formData
    .getAll("targetRoles")
    .map((value) => String(value))
    .filter((value): value is "employee" | "manager" =>
      announcementTargetRoleSchema.safeParse(value).success,
    );

  const targetDepartmentIds = formData
    .getAll("targetDepartmentIds")
    .map((value) => String(value))
    .filter(Boolean);

  const branchIdRaw = String(formData.get("branchId") ?? "").trim();

  return announcementFormSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    publishMode: formData.get("publishMode"),
    branchId: branchIdRaw || null,
    targetRoles,
    targetDepartmentIds,
    displayFrom: String(formData.get("displayFrom") ?? "").trim() || null,
    displayUntil: String(formData.get("displayUntil") ?? "").trim() || null,
    isPinned: formData.get("isPinned") === "true",
    removeAttachment: formData.get("removeAttachment") === "true",
    removeAttachmentIds: formData
      .getAll("removeAttachmentIds")
      .map((value) => String(value))
      .filter(Boolean),
  });
}

function parseAttachmentFiles(formData: FormData): File[] {
  return formData
    .getAll("attachments")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

function revalidateAnnouncementPaths() {
  revalidatePath("/hr/announcements");
  revalidatePath("/employee/announcements");
  revalidatePath("/employee/dashboard");
  revalidatePath("/manager/announcements");
  revalidatePath("/manager/dashboard");
  revalidatePath("/hr/dashboard");
}

export async function createAnnouncementAction(
  _prev: AnnouncementActionState,
  formData: FormData,
): Promise<AnnouncementActionState> {
  const parsed = parseAnnouncementForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid announcement details." };
  }

  const files = parseAttachmentFiles(formData);

  try {
    requireModule("announcements");
    const session = await requireRole("hr_administrator");
    await createAnnouncement({
      form: parsed.data,
      actorUserId: session.user.id,
      attachments: files,
    });
    revalidateAnnouncementPaths();
    return {
      success:
        parsed.data.publishMode === "draft"
          ? "Draft saved."
          : parsed.data.publishMode === "schedule"
            ? "Announcement scheduled."
            : "Announcement published.",
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to save announcement.",
    };
  }
}

export async function updateAnnouncementAction(
  _prev: AnnouncementActionState,
  formData: FormData,
): Promise<AnnouncementActionState> {
  const announcementId = String(formData.get("announcementId") ?? "").trim();
  if (!announcementId) return { error: "Missing announcement." };

  const parsed = parseAnnouncementForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid announcement details." };
  }

  const files = parseAttachmentFiles(formData);

  try {
    requireModule("announcements");
    const session = await requireRole("hr_administrator");
    await updateAnnouncement({
      announcementId,
      form: parsed.data,
      actorUserId: session.user.id,
      attachments: files,
    });
    revalidateAnnouncementPaths();
    revalidatePath(`/employee/announcements/${announcementId}`);
    revalidatePath(`/manager/announcements/${announcementId}`);
    return {
      success:
        parsed.data.publishMode === "draft"
          ? "Draft updated."
          : parsed.data.publishMode === "schedule"
            ? "Announcement scheduled."
            : "Announcement updated.",
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update announcement.",
    };
  }
}

export async function deleteAnnouncementAction(announcementId: string): Promise<AnnouncementActionState> {
  try {
    requireModule("announcements");
    await requireRole("hr_administrator");
    await deleteAnnouncement(announcementId);
    revalidateAnnouncementPaths();
    return { success: "Announcement deleted." };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to delete announcement.",
    };
  }
}
