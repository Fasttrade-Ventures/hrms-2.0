"use server";

import { revalidatePath } from "next/cache";

import { uploadDocumentSchema } from "@hrms/validation";

import { logDocumentEvent } from "@/lib/audit/log-document-event";
import { requireEmployeeContext } from "@/lib/employee/leave";
import { getMyDocumentComplianceSummary } from "@/lib/employee/documents";
import { requireModule } from "@/lib/entitlements";
import { assertDocumentUpload, uploadOrganizationFile } from "@/lib/files/storage";
import { queueDocumentComplianceNotifications } from "@/lib/hr/document-notifications";
import { saveEmployeeDocument } from "@/lib/hr/documents";

export type EmployeeDocumentActionState = {
  error?: string;
  success?: string;
};

export async function uploadMyDocumentAction(
  _prev: EmployeeDocumentActionState,
  formData: FormData,
): Promise<EmployeeDocumentActionState> {
  const file = formData.get("file");

  try {
    await requireModule("documents");
    const { employeeId, organizationId, session } = await requireEmployeeContext();

    const folderIdRaw = String(formData.get("folderId") ?? "").trim();
    const parsed = uploadDocumentSchema.safeParse({
      employeeId,
      documentType: formData.get("documentType"),
      folderId: folderIdRaw || null,
      expiresAt: String(formData.get("expiresAt") ?? "").trim() || null,
    });

    if (!parsed.success) return { error: "Invalid document details." };
    if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to upload." };

    const summary = await getMyDocumentComplianceSummary();
    const allowed = summary.uploadableTypes.some(
      (type) => type.name.toLowerCase() === parsed.data.documentType.toLowerCase(),
    );
    if (!allowed) {
      return { error: "You can only upload documents that are missing or expired." };
    }

    const requiredType = summary.uploadableTypes.find(
      (type) => type.name.toLowerCase() === parsed.data.documentType.toLowerCase(),
    );
    if (requiredType?.requiresExpiry && !parsed.data.expiresAt) {
      return { error: "Expiry date is required for this document type." };
    }

    assertDocumentUpload(file);
    const body = new Uint8Array(await file.arrayBuffer());
    const fileId = await uploadOrganizationFile({
      organizationId,
      category: "employee-documents",
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      body,
      uploadedByUserId: session.user.id,
    });

    const { id, replaced } = await saveEmployeeDocument({
      organizationId,
      employeeId,
      documentType: parsed.data.documentType,
      fileId,
      folderId: parsed.data.folderId,
      expiresAt: parsed.data.expiresAt,
    });

    await logDocumentEvent({
      organizationId,
      actorUserId: session.user.id,
      action: replaced ? "document.replaced" : "document.uploaded",
      documentId: id,
      metadata: {
        employeeId,
        documentType: parsed.data.documentType,
        fileName: file.name,
        uploadedBy: "employee",
      },
    });

    await queueDocumentComplianceNotifications({
      employeeId,
      documentType: parsed.data.documentType,
    });

    revalidatePath("/employee/documents");
    revalidatePath("/hr/documents/compliance");

    return { success: replaced ? "Document replaced." : "Document uploaded." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to upload document." };
  }
}
