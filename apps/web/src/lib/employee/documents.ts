import { requireEmployeeContext } from "@/lib/employee/leave";
import { createClient } from "@/lib/supabase/server";
import {
  documentTypesMatch,
  resolveDocumentCompliance,
  type ComplianceStatus,
} from "@/lib/hr/document-compliance";
import { rolesCanAccessFolder } from "@/lib/hr/document-folder-access";

export type MyDocumentRow = {
  id: string;
  documentType: string;
  fileId: string;
  fileName: string;
  expiresAt: string | null;
  createdAt: string;
  complianceStatus: ComplianceStatus | null;
};

export type MyDocumentComplianceSummary = {
  missing: number;
  expiring: number;
  uploadableTypes: Array<{ id: string; name: string; requiresExpiry: boolean }>;
};

export async function listMyDocuments(): Promise<MyDocumentRow[]> {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [documentsResult, requiredResult] = await Promise.all([
    supabase
      .from("employee_documents")
      .select(
        "id, document_type, expires_at, created_at, file_id, file_objects(file_name, deleted_at), document_folders(access_roles)",
      )
      .eq("organization_id", organizationId)
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false }),
    supabase
      .from("required_documents")
      .select("name, requires_expiry, warning_days")
      .eq("organization_id", organizationId)
      .eq("is_active", true),
  ]);

  if (documentsResult.error) throw new Error(documentsResult.error.message);
  if (requiredResult.error) throw new Error(requiredResult.error.message);

  const requiredByName = new Map(
    (requiredResult.data ?? []).map((row) => [row.name.toLowerCase(), row]),
  );

  return (documentsResult.data ?? [])
    .map((row) => {
      const file = Array.isArray(row.file_objects) ? row.file_objects[0] : row.file_objects;
      const folder = Array.isArray(row.document_folders)
        ? row.document_folders[0]
        : row.document_folders;

      if (!file || file.deleted_at) return null;
      if (!rolesCanAccessFolder(folder?.access_roles, ["employee"])) return null;

      const required = requiredByName.get(row.document_type.toLowerCase());
      const complianceStatus = required
        ? resolveDocumentCompliance({
            required: {
              requiresExpiry: required.requires_expiry,
              warningDays: required.warning_days,
            },
            document: { expiresAt: row.expires_at },
            today,
          })
        : null;

      return {
        id: row.id,
        documentType: row.document_type,
        fileId: row.file_id,
        fileName: file.file_name ?? "Document",
        expiresAt: row.expires_at,
        createdAt: row.created_at,
        complianceStatus,
      };
    })
    .filter((row): row is MyDocumentRow => row !== null);
}

export async function getMyDocumentComplianceSummary(): Promise<MyDocumentComplianceSummary> {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [requiredResult, documentsResult] = await Promise.all([
    supabase
      .from("required_documents")
      .select("id, name, requires_expiry, warning_days")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("employee_documents")
      .select("document_type, expires_at, created_at, file_objects(deleted_at)")
      .eq("organization_id", organizationId)
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false }),
  ]);

  if (requiredResult.error) throw new Error(requiredResult.error.message);
  if (documentsResult.error) throw new Error(documentsResult.error.message);

  const docs = (documentsResult.data ?? []).filter((row) => {
    const file = Array.isArray(row.file_objects) ? row.file_objects[0] : row.file_objects;
    return file && !file.deleted_at;
  });

  let missing = 0;
  let expiring = 0;
  const uploadableTypes: Array<{ id: string; name: string; requiresExpiry: boolean }> = [];

  for (const required of requiredResult.data ?? []) {
    const latest = docs.find((doc) => documentTypesMatch(doc.document_type, required.name));
    const status = resolveDocumentCompliance({
      required: {
        requiresExpiry: required.requires_expiry,
        warningDays: required.warning_days,
      },
      document: latest ? { expiresAt: latest.expires_at } : null,
      today,
    });

    if (status === "missing" || status === "expired") {
      missing += 1;
      uploadableTypes.push({
        id: required.id,
        name: required.name,
        requiresExpiry: required.requires_expiry,
      });
    } else if (status === "expiring") {
      expiring += 1;
    }
  }

  return { missing, expiring, uploadableTypes };
}
