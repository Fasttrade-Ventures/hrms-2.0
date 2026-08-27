import { createClient } from "@/lib/supabase/server";
import { requireBranchAdminContext } from "@/lib/branch-admin/context";

export type BranchDocumentRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  documentType: string;
  fileName: string;
  expiresAt: string | null;
  createdAt: string;
};

export async function listBranchDocuments(page = 1, pageSize = 20): Promise<{
  rows: BranchDocumentRow[];
  total: number;
  page: number;
  pageSize: number;
  truncated: boolean;
}> {
  const context = await requireBranchAdminContext();
  const supabase = await createClient();

  const { data: employees, error: employeesError } = await supabase
    .from("employees")
    .select("id")
    .eq("organization_id", context.organizationId)
    .eq("branch_id", context.branchId)
    .eq("status", "active");

  if (employeesError) throw new Error(employeesError.message);
  const employeeIds = (employees ?? []).map((row) => row.id);
  if (employeeIds.length === 0) {
    return { rows: [], total: 0, page, pageSize, truncated: false };
  }

  const fetchedCap = 500;
  const { data, error, count } = await supabase
    .from("employee_documents")
    .select(
      "id, employee_id, document_type, expires_at, created_at, file_objects(file_name, deleted_at), employees(full_name, employee_number)",
      { count: "exact" },
    )
    .eq("organization_id", context.organizationId)
    .in("employee_id", employeeIds)
    .order("created_at", { ascending: false })
    .limit(fetchedCap);

  if (error) throw new Error(error.message);

  const mapped = (data ?? [])
    .map((row) => {
      const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
      const file = Array.isArray(row.file_objects) ? row.file_objects[0] : row.file_objects;
      if ((file as { deleted_at?: string | null } | null)?.deleted_at) return null;
      return {
        id: row.id,
        employeeId: row.employee_id,
        employeeName: (employee as { full_name?: string } | null)?.full_name ?? "Employee",
        employeeNumber: (employee as { employee_number?: string } | null)?.employee_number ?? "",
        documentType: row.document_type,
        fileName: (file as { file_name?: string } | null)?.file_name ?? "File",
        expiresAt: row.expires_at,
        createdAt: row.created_at,
      } satisfies BranchDocumentRow;
    })
    .filter((row): row is BranchDocumentRow => row !== null);

  const total = mapped.length;
  const start = (page - 1) * pageSize;
  const rows = mapped.slice(start, start + pageSize);

  return {
    rows,
    total,
    page,
    pageSize,
    truncated: (count ?? 0) > fetchedCap || (data?.length ?? 0) >= fetchedCap,
  };
}
