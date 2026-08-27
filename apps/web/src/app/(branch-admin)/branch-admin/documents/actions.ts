"use server";

import { revalidatePath } from "next/cache";

import { uploadDocumentSchema } from "@hrms/validation";

import { logDocumentEvent } from "@/lib/audit/log-document-event";
import { assertEmployeeInBranchScope } from "@/lib/branch-admin/documents";
import { requireBranchAdminContext } from "@/lib/branch-admin/context";
import { requireModule } from "@/lib/entitlements";
import { assertDocumentUpload, uploadOrganizationFile } from "@/lib/files/storage";
import { attachEmployeeDocument, listRequiredDocuments } from "@/lib/hr/documents";

export type DocumentActionState = {
  error?: string;
  success?: string;
};

export async function uploadBranchDocumentAction(
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
    await requireModule("documents");
    const context = await requireBranchAdminContext();
    await assertEmployeeInBranchScope(parsed.data.employeeId);
    assertDocumentUpload(file);

    const requiredTypes = await listRequiredDocuments(true);
    const allowed = requiredTypes.some(
      (type) => type.name.toLowerCase() === parsed.data.documentType.toLowerCase(),
    );
    if (!allowed) return { error: "Document type must match an active required document rule." };

    if (
      parsed.data.expiresAt === null &&
      requiredTypes.find((t) => t.name.toLowerCase() === parsed.data.documentType.toLowerCase())
        ?.requiresExpiry
    ) {
      return { error: "Expiry date is required for this document type." };
    }

    const body = new Uint8Array(await file.arrayBuffer());
    const fileId = await uploadOrganizationFile({
      organizationId: context.organizationId,
      category: "employee-documents",
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      body,
      uploadedByUserId: context.session.user.id,
    });

    const { id, replaced } = await attachEmployeeDocument({
      employeeId: parsed.data.employeeId,
      documentType: parsed.data.documentType,
      fileId,
      folderId: parsed.data.folderId,
      expiresAt: parsed.data.expiresAt,
    });

    await logDocumentEvent({
      organizationId: context.organizationId,
      actorUserId: context.session.user.id,
      action: replaced ? "document.replaced" : "document.uploaded",
      documentId: id,
      metadata: {
        employeeId: parsed.data.employeeId,
        documentType: parsed.data.documentType,
        portal: "branch-admin",
      },
    });

    revalidatePath("/branch-admin/documents");
    revalidatePath("/branch-admin/documents/compliance");
    return { success: replaced ? "Document replaced." : "Document uploaded." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Upload failed." };
  }
}
