import { createClient } from "@/lib/supabase/server";

import {
  documentTypesMatch,
  resolveDocumentCompliance,
} from "@/lib/hr/document-compliance";

import { getOrganizationIdForReports, listReportEmployees, paginateRows } from "./context";
import type { ReportFilters } from "./types";

export type DocumentComplianceReportRow = Record<string, string | number | null>;

export async function listDocumentComplianceRows(filters: ReportFilters): Promise<{
  columns: { key: string; label: string }[];
  rows: DocumentComplianceReportRow[];
  total: number;
}> {
  const supabase = await createClient();
  const organizationId = getOrganizationIdForReports();
  const today = new Date().toISOString().slice(0, 10);
  const employees = await listReportEmployees(filters);
  const employeeIds = employees.map((employee) => employee.id);

  const [requiredRes, documentsRes] = await Promise.all([
    supabase
      .from("required_documents")
      .select("id, name, requires_expiry, warning_days")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("sort_order"),
    employeeIds.length
      ? supabase
          .from("employee_documents")
          .select("employee_id, document_type, expires_at, created_at, file_objects(deleted_at)")
          .eq("organization_id", organizationId)
          .in("employee_id", employeeIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (requiredRes.error) throw new Error(requiredRes.error.message);
  if (documentsRes.error) throw new Error(documentsRes.error.message);

  const requiredTypes = requiredRes.data ?? [];
  const docsByEmployee = new Map<string, Array<{ documentType: string; expiresAt: string | null }>>();

  for (const row of documentsRes.data ?? []) {
    const file = Array.isArray(row.file_objects) ? row.file_objects[0] : row.file_objects;
    if (file?.deleted_at) continue;
    const list = docsByEmployee.get(row.employee_id) ?? [];
    list.push({ documentType: row.document_type, expiresAt: row.expires_at });
    docsByEmployee.set(row.employee_id, list);
  }

  const flatRows: DocumentComplianceReportRow[] = [];

  for (const employee of employees) {
    for (const required of requiredTypes) {
      const matches = (docsByEmployee.get(employee.id) ?? []).filter((doc) =>
        documentTypesMatch(doc.documentType, required.name),
      );
      const latest = matches[0] ?? null;
      const status = resolveDocumentCompliance({
        required: {
          requiresExpiry: required.requires_expiry,
          warningDays: required.warning_days,
        },
        document: latest ? { expiresAt: latest.expiresAt } : null,
        today,
      });

      flatRows.push({
        employeeNumber: employee.employeeNumber,
        employeeName: employee.fullName,
        requiredDocument: required.name,
        status,
        expiresAt: latest?.expiresAt ?? null,
      });
    }
  }

  const { rows, total } = paginateRows(flatRows, filters);
  return {
    columns: [
      { key: "employeeNumber", label: "Employee #" },
      { key: "employeeName", label: "Employee" },
      { key: "requiredDocument", label: "Required document" },
      { key: "status", label: "Status" },
      { key: "expiresAt", label: "Expires" },
    ],
    rows,
    total,
  };
}
