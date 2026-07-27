import { requireManagerContext } from "@/lib/manager/context";
import { listTeamMembers } from "@/lib/manager/team";
import {
  documentTypesMatch,
  resolveDocumentCompliance,
  type ComplianceStatus,
} from "@/lib/hr/document-compliance";
import { rolesCanAccessFolder } from "@/lib/hr/document-folder-access";
import { createClient } from "@/lib/supabase/server";

export type TeamDocumentRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  documentType: string;
  fileId: string;
  fileName: string;
  expiresAt: string | null;
  complianceStatus: ComplianceStatus | null;
  createdAt: string;
};

export type TeamComplianceSummaryRow = {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  missing: number;
  expiring: number;
};

export async function listTeamDocuments(): Promise<TeamDocumentRow[]> {
  const reports = await listTeamMembers();
  if (!reports.length) return [];

  const { organizationId } = await requireManagerContext();
  const supabase = await createClient();
  const reportIds = reports.map((report) => report.id);
  const reportById = new Map(reports.map((report) => [report.id, report]));
  const today = new Date().toISOString().slice(0, 10);

  const [documentsResult, requiredResult] = await Promise.all([
    supabase
      .from("employee_documents")
      .select(
        "id, employee_id, document_type, expires_at, created_at, file_id, file_objects(file_name, deleted_at), document_folders(access_roles)",
      )
      .eq("organization_id", organizationId)
      .in("employee_id", reportIds)
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
      if (!rolesCanAccessFolder(folder?.access_roles, ["manager"])) return null;

      const report = reportById.get(row.employee_id);
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
        employeeId: row.employee_id,
        employeeName: report?.fullName ?? "Employee",
        employeeNumber: report?.employeeNumber ?? "—",
        documentType: row.document_type,
        fileId: row.file_id,
        fileName: file.file_name ?? "Document",
        expiresAt: row.expires_at,
        complianceStatus,
        createdAt: row.created_at,
      };
    })
    .filter((row): row is TeamDocumentRow => row !== null);
}

export async function listTeamComplianceSummary(): Promise<TeamComplianceSummaryRow[]> {
  const reports = await listTeamMembers();
  if (!reports.length) return [];

  const { organizationId } = await requireManagerContext();
  const supabase = await createClient();
  const reportIds = reports.map((report) => report.id);
  const today = new Date().toISOString().slice(0, 10);

  const [requiredResult, documentsResult] = await Promise.all([
    supabase
      .from("required_documents")
      .select("name, requires_expiry, warning_days")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("employee_documents")
      .select("employee_id, document_type, expires_at, created_at, file_objects(deleted_at)")
      .eq("organization_id", organizationId)
      .in("employee_id", reportIds)
      .order("created_at", { ascending: false }),
  ]);

  if (requiredResult.error) throw new Error(requiredResult.error.message);
  if (documentsResult.error) throw new Error(documentsResult.error.message);

  const docsByEmployee = new Map<string, Array<{ documentType: string; expiresAt: string | null }>>();
  for (const row of documentsResult.data ?? []) {
    const file = Array.isArray(row.file_objects) ? row.file_objects[0] : row.file_objects;
    if (file?.deleted_at) continue;
    const list = docsByEmployee.get(row.employee_id) ?? [];
    list.push({ documentType: row.document_type, expiresAt: row.expires_at });
    docsByEmployee.set(row.employee_id, list);
  }

  return reports.map((report) => {
    let missing = 0;
    let expiring = 0;

    for (const required of requiredResult.data ?? []) {
      const latest = (docsByEmployee.get(report.id) ?? []).find((doc) =>
        documentTypesMatch(doc.documentType, required.name),
      );
      const status = resolveDocumentCompliance({
        required: {
          requiresExpiry: required.requires_expiry,
          warningDays: required.warning_days,
        },
        document: latest ? { expiresAt: latest.expiresAt } : null,
        today,
      });

      if (status === "missing" || status === "expired") missing += 1;
      if (status === "expiring") expiring += 1;
    }

    return {
      employeeId: report.id,
      employeeName: report.fullName,
      employeeNumber: report.employeeNumber,
      missing,
      expiring,
    };
  });
}
