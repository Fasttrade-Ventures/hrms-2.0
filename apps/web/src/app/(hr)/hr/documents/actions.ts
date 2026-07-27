"use server";

import { revalidatePath } from "next/cache";

import {
  documentFolderSchema,
  requiredDocumentSchema,
  uploadDocumentSchema,
} from "@hrms/validation";

import { logDocumentEvent } from "@/lib/audit/log-document-event";
import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";
import { assertDocumentUpload, uploadOrganizationFile } from "@/lib/files/storage";
import {
  attachEmployeeDocument,
  createRequiredDocument,
  deleteEmployeeDocument,
  deleteRequiredDocument,
  listRequiredDocuments,
  updateRequiredDocument,
} from "@/lib/hr/documents";
import { createDocumentFolder, deleteDocumentFolder, updateDocumentFolder } from "@/lib/hr/document-folders";
import { queueDocumentComplianceNotifications } from "@/lib/hr/document-notifications";

export type DocumentActionState = {
  error?: string;
  success?: string;
};

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export async function uploadDocumentAction(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const file = formData.get("file");
  const folderIdRaw = String(formData.get("folderId") ?? "").trim();
  const parsed = uploadDocumentSchema.safeParse({
    employeeId: formData.get("employeeId"),
    documentType: formData.get("documentType"),
    folderId: folderIdRaw || null,
    expiresAt: String(formData.get("expiresAt") ?? "").trim() || null,
  });

  if (!parsed.success) return { error: "Invalid document details." };
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to upload." };

  try {
    requireModule("documents");
    const session = await requireRole("hr_administrator");
    assertDocumentUpload(file);

    const requiredTypes = await listRequiredDocuments(true);
    const allowed = requiredTypes.some(
      (type) => type.name.toLowerCase() === parsed.data.documentType.toLowerCase(),
    );
    if (!allowed) return { error: "Document type must match an active required document rule." };

    if (parsed.data.expiresAt === null && requiredTypes.find((t) => t.name.toLowerCase() === parsed.data.documentType.toLowerCase())?.requiresExpiry) {
      return { error: "Expiry date is required for this document type." };
    }

    const body = new Uint8Array(await file.arrayBuffer());
    const fileId = await uploadOrganizationFile({
      organizationId: getOrganizationId(),
      category: "employee-documents",
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      body,
      uploadedByUserId: session.user.id,
    });

    const { id, replaced } = await attachEmployeeDocument({
      employeeId: parsed.data.employeeId,
      documentType: parsed.data.documentType,
      fileId,
      folderId: parsed.data.folderId,
      expiresAt: parsed.data.expiresAt,
    });

    await logDocumentEvent({
      organizationId: getOrganizationId(),
      actorUserId: session.user.id,
      action: replaced ? "document.replaced" : "document.uploaded",
      documentId: id,
      metadata: {
        employeeId: parsed.data.employeeId,
        documentType: parsed.data.documentType,
        fileName: file.name,
      },
    });

    await queueDocumentComplianceNotifications({
      employeeId: parsed.data.employeeId,
      documentType: parsed.data.documentType,
    });

    revalidatePath("/hr/documents");
    revalidatePath("/hr/documents/library");
    revalidatePath("/hr/documents/compliance");
    revalidatePath("/employee/documents");
    revalidatePath(`/hr/employees/${parsed.data.employeeId}`);

    return { success: replaced ? "Document replaced." : "Document uploaded." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to upload document." };
  }
}

export async function deleteDocumentAction(documentId: string): Promise<DocumentActionState> {
  try {
    requireModule("documents");
    const session = await requireRole("hr_administrator");
    await deleteEmployeeDocument(documentId, session.user.id);

    revalidatePath("/hr/documents");
    revalidatePath("/hr/documents/library");
    revalidatePath("/hr/documents/compliance");
    revalidatePath("/employee/documents");

    return { success: "Document permanently deleted." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to delete document." };
  }
}

export async function saveRequiredDocumentAction(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const id = String(formData.get("id") ?? "").trim() || undefined;
  const parsed = requiredDocumentSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    requiresExpiry: formData.get("requiresExpiry") !== null,
    warningDays: formData.get("warningDays"),
    isActive: formData.get("isActive") !== null,
    sortOrder: formData.get("sortOrder"),
  });

  if (!parsed.success) return { error: "Invalid required document details." };

  try {
    requireModule("documents");
    await requireRole("hr_administrator");

    if (id) {
      await updateRequiredDocument(id, parsed.data);
    } else {
      await createRequiredDocument(parsed.data);
    }

    revalidatePath("/hr/documents/required");
    revalidatePath("/hr/documents/compliance");
    return { success: id ? "Required document updated." : "Required document created." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to save required document." };
  }
}

export async function deleteRequiredDocumentAction(id: string): Promise<DocumentActionState> {
  try {
    requireModule("documents");
    await requireRole("hr_administrator");
    await deleteRequiredDocument(id);
    revalidatePath("/hr/documents/required");
    revalidatePath("/hr/documents/compliance");
    return { success: "Required document removed." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to delete required document." };
  }
}

export async function saveDocumentFolderAction(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const id = String(formData.get("id") ?? "").trim() || undefined;
  const accessRoles = formData.getAll("accessRoles").map(String);
  const parsed = documentFolderSchema.safeParse({
    name: formData.get("name"),
    parentId: formData.get("parentId") || null,
    accessRoles: accessRoles.length > 0 ? accessRoles : ["hr_administrator", "employee"],
  });

  if (!parsed.success) return { error: "Invalid folder details." };

  try {
    requireModule("documents");
    await requireRole("hr_administrator");

    if (id) {
      await updateDocumentFolder(id, parsed.data);
    } else {
      await createDocumentFolder(parsed.data);
    }

    revalidatePath("/hr/documents/folders");
    revalidatePath("/hr/documents/library");
    return { success: id ? "Folder updated." : "Folder created." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to save folder." };
  }
}

export async function deleteDocumentFolderAction(id: string): Promise<DocumentActionState> {
  try {
    requireModule("documents");
    await requireRole("hr_administrator");
    await deleteDocumentFolder(id);
    revalidatePath("/hr/documents/folders");
    return { success: "Folder deleted." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to delete folder." };
  }
}
