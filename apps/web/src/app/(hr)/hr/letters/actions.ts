"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createLetterTemplateSchema,
  previewLetterTemplateSchema,
  updateLetterTemplateSchema,
} from "@hrms/validation";

import { requireOrganizationId } from "@/lib/auth/organization-context";
import { requireRole } from "@/lib/auth/session";
import { hardDeleteOrganizationFile } from "@/lib/files/storage";
import { setOrganizationLetterhead, uploadLetterheadFile } from "@/lib/letters/letterhead";
import { setOrganizationLetterContacts } from "@/lib/letters/org-contacts";
import { renderLetterPreview, SAMPLE_MERGE_VALUES } from "@/lib/letters/render-pdf";
import {
  createLetterTemplate,
  setLetterTemplateActive,
  updateLetterTemplate,
} from "@/lib/letters/templates";

export type LetterActionState = {
  error?: string;
  success?: string;
  preview?: string;
};

const LETTER_ROLES = ["hr_administrator", "organization_owner"] as const;

function pickFile(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

function isRedirect(error: unknown): boolean {
  return error instanceof Error && error.message === "NEXT_REDIRECT";
}

function formatError(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "issues" in error) {
    const issues = (error as { issues: Array<{ message: string }> }).issues;
    if (issues[0]?.message) return issues[0].message;
  }
  return error instanceof Error ? error.message : fallback;
}

export async function createLetterTemplateAction(
  _prev: LetterActionState,
  formData: FormData,
): Promise<LetterActionState> {
  try {
    const session = await requireRole(...LETTER_ROLES);
    const letterheadFile = pickFile(formData, "letterheadFile");
    const letterheadFileId = letterheadFile
      ? await uploadLetterheadFile({
          organizationId: await requireOrganizationId(),
          file: letterheadFile,
          actorUserId: session.user.id,
        })
      : null;
    const parsed = createLetterTemplateSchema.parse({
      name: formData.get("name"),
      type: formData.get("type"),
      body: formData.get("body"),
      isActive: formData.get("isActive") === "on",
      letterheadFileId,
    });
    try {
      await createLetterTemplate(parsed, session.user.id);
    } catch (error) {
      if (letterheadFileId) await hardDeleteOrganizationFile(letterheadFileId).catch(() => undefined);
      throw error;
    }
    revalidatePath("/hr/letters");
    redirect("/hr/letters");
  } catch (error) {
    if (isRedirect(error)) throw error;
    return { error: formatError(error, "Failed to create template.") };
  }
}

export async function updateLetterTemplateAction(
  _prev: LetterActionState,
  formData: FormData,
): Promise<LetterActionState> {
  try {
    const session = await requireRole(...LETTER_ROLES);
    const letterheadFile = pickFile(formData, "letterheadFile");
    const newLetterheadFileId = letterheadFile
      ? await uploadLetterheadFile({
          organizationId: await requireOrganizationId(),
          file: letterheadFile,
          actorUserId: session.user.id,
        })
      : null;
    // undefined = keep current, null = clear override, uuid = replace.
    const letterheadFileId =
      newLetterheadFileId ?? (formData.get("removeLetterhead") === "on" ? null : undefined);
    const parsed = updateLetterTemplateSchema.parse({
      templateId: formData.get("templateId"),
      name: formData.get("name"),
      type: formData.get("type"),
      body: formData.get("body"),
      isActive: formData.get("isActive") === "on",
      letterheadFileId,
    });
    try {
      await updateLetterTemplate(parsed);
    } catch (error) {
      if (newLetterheadFileId) await hardDeleteOrganizationFile(newLetterheadFileId).catch(() => undefined);
      throw error;
    }
    revalidatePath("/hr/letters");
    revalidatePath(`/hr/letters/${parsed.templateId}/edit`);
    return { success: "Template saved." };
  } catch (error) {
    if (isRedirect(error)) throw error;
    return { error: formatError(error, "Failed to save template.") };
  }
}

export async function setLetterTemplateActiveAction(
  _prev: LetterActionState,
  formData: FormData,
): Promise<LetterActionState> {
  try {
    await requireRole(...LETTER_ROLES);
    const templateId = String(formData.get("templateId") ?? "");
    if (!templateId) return { error: "Template ID is required." };
    const isActive = formData.get("isActive") === "true";
    await setLetterTemplateActive(templateId, isActive);
    revalidatePath("/hr/letters");
    revalidatePath(`/hr/letters/${templateId}/edit`);
    return { success: isActive ? "Template activated." : "Template deactivated." };
  } catch (error) {
    if (isRedirect(error)) throw error;
    return { error: formatError(error, "Failed to update template.") };
  }
}

export async function previewLetterTemplateAction(
  _prev: LetterActionState,
  formData: FormData,
): Promise<LetterActionState> {
  try {
    await requireRole(...LETTER_ROLES);
    const parsed = previewLetterTemplateSchema.parse({ body: formData.get("body") });
    return { preview: renderLetterPreview(parsed.body, SAMPLE_MERGE_VALUES) };
  } catch (error) {
    if (isRedirect(error)) throw error;
    return { error: formatError(error, "Failed to render preview.") };
  }
}

export async function uploadOrganizationLetterheadAction(
  _prev: LetterActionState,
  formData: FormData,
): Promise<LetterActionState> {
  try {
    const session = await requireRole(...LETTER_ROLES);
    const file = pickFile(formData, "letterheadFile");
    if (!file) return { error: "Choose a PNG or JPG image." };
    const organizationId = await requireOrganizationId();
    const fileId = await uploadLetterheadFile({ organizationId, file, actorUserId: session.user.id });
    try {
      await setOrganizationLetterhead(organizationId, fileId);
    } catch (error) {
      await hardDeleteOrganizationFile(fileId).catch(() => undefined);
      throw error;
    }
    revalidatePath("/hr/letters");
    return { success: "Default letterhead saved." };
  } catch (error) {
    if (isRedirect(error)) throw error;
    return { error: formatError(error, "Failed to upload letterhead.") };
  }
}

export async function removeOrganizationLetterheadAction(
  _prev: LetterActionState,
  _formData: FormData,
): Promise<LetterActionState> {
  try {
    await requireRole(...LETTER_ROLES);
    await setOrganizationLetterhead(await requireOrganizationId(), null);
    revalidatePath("/hr/letters");
    return { success: "Default letterhead removed." };
  } catch (error) {
    if (isRedirect(error)) throw error;
    return { error: formatError(error, "Failed to remove letterhead.") };
  }
}

export async function saveOrganizationLetterContactsAction(
  _prev: LetterActionState,
  formData: FormData,
): Promise<LetterActionState> {
  try {
    await requireRole(...LETTER_ROLES);
    const companyEmail = String(formData.get("companyEmail") ?? "").trim() || null;
    const companyPhone = String(formData.get("companyPhone") ?? "").trim() || null;
    if (companyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyEmail)) {
      return { error: "Enter a valid company email, or leave it blank." };
    }
    await setOrganizationLetterContacts(await requireOrganizationId(), { companyEmail, companyPhone });
    revalidatePath("/hr/letters");
    return { success: "Company contacts saved." };
  } catch (error) {
    if (isRedirect(error)) throw error;
    return { error: formatError(error, "Failed to save company contacts.") };
  }
}
