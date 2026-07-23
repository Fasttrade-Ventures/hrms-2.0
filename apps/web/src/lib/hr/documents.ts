import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export type HrDocumentRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  documentType: string;
  fileName: string;
  expiresAt: string | null;
  createdAt: string;
};

export async function listEmployeeDocuments(): Promise<HrDocumentRow[]> {
  await requireRole("hr_administrator");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("employee_documents")
    .select(
      "id, employee_id, document_type, expires_at, created_at, employees(full_name, email), file_objects(file_name)",
    )
    .eq("organization_id", getOrganizationId())
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
    const file = Array.isArray(row.file_objects) ? row.file_objects[0] : row.file_objects;

    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName:
        (employee as { full_name?: string; email?: string } | null)?.full_name ??
        (employee as { email?: string } | null)?.email ??
        "Employee",
      documentType: row.document_type,
      fileName: (file as { file_name?: string } | null)?.file_name ?? "Document",
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    };
  });
}

export async function attachEmployeeDocument(input: {
  employeeId: string;
  documentType: string;
  fileId: string;
  expiresAt?: string;
}): Promise<void> {
  await requireRole("hr_administrator");
  const supabase = await createClient();

  const { error } = await supabase.from("employee_documents").insert({
    organization_id: getOrganizationId(),
    employee_id: input.employeeId,
    document_type: input.documentType,
    file_id: input.fileId,
    expires_at: input.expiresAt ?? null,
  });

  if (error) throw new Error(error.message);
}
