import type { DocumentLibraryFilters } from "@hrms/validation";

import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  documentTypesMatch,
  employeeDocumentUploadDecision,
  resolveDocumentCompliance,
  type ComplianceStatus,
} from "@/lib/hr/document-compliance";

export const DOCUMENT_LIBRARY_PAGE_SIZE = 25;

const PAGE_SIZE = DOCUMENT_LIBRARY_PAGE_SIZE;

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export type HrDocumentRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  documentType: string;
  fileId: string;
  fileName: string;
  folderId: string | null;
  folderName: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export type RequiredDocumentRow = {
  id: string;
  name: string;
  description: string | null;
  requiresExpiry: boolean;
  warningDays: number;
  isActive: boolean;
  sortOrder: number;
};

export type DocumentsHubStats = {
  totalDocuments: number;
  expiringCount: number;
  missingComplianceCount: number;
  folderCount: number;
  requiredTypeCount: number;
  recentDocuments: HrDocumentRow[];
};

export type ComplianceMatrixRow = {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  cells: Array<{
    requiredDocumentId: string;
    requiredDocumentName: string;
    status: ComplianceStatus;
    expiresAt: string | null;
  }>;
};

type RawDocumentRow = {
  id: string;
  employee_id: string;
  document_type: string;
  expires_at: string | null;
  created_at: string;
  folder_id: string | null;
  file_id: string;
  employees:
    | { full_name: string | null; email: string | null; employee_number: string | null }
    | Array<{ full_name: string | null; email: string | null; employee_number: string | null }>
    | null;
  file_objects:
    | { file_name: string | null; deleted_at: string | null }
    | Array<{ file_name: string | null; deleted_at: string | null }>
    | null;
  document_folders: { name: string | null } | Array<{ name: string | null }> | null;
};

function mapDocumentRow(row: RawDocumentRow): HrDocumentRow | null {
  const file = Array.isArray(row.file_objects) ? row.file_objects[0] : row.file_objects;
  if (!file || file.deleted_at) return null;

  const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
  const folder = Array.isArray(row.document_folders) ? row.document_folders[0] : row.document_folders;

  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: employee?.full_name ?? employee?.email ?? "Employee",
    employeeNumber: employee?.employee_number ?? "—",
    documentType: row.document_type,
    fileId: row.file_id,
    fileName: file.file_name ?? "Document",
    folderId: row.folder_id,
    folderName: folder?.name ?? null,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

function matchesStatus(row: HrDocumentRow, status: DocumentLibraryFilters["status"], today: string): boolean {
  if (status === "all") return true;
  if (status === "no_expiry") return !row.expiresAt;
  if (!row.expiresAt) return false;

  const todayMs = Date.parse(`${today}T00:00:00Z`);
  const expiresMs = Date.parse(`${row.expiresAt}T00:00:00Z`);

  if (status === "expired") return expiresMs < todayMs;
  if (status === "expiring") {
    const horizonMs = todayMs + 30 * 86_400_000;
    return expiresMs >= todayMs && expiresMs <= horizonMs;
  }
  return true;
}

export async function listDocumentLibrary(
  filters: DocumentLibraryFilters,
): Promise<{ rows: HrDocumentRow[]; total: number; page: number; pageSize: number }> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = getOrganizationId();
  const today = new Date().toISOString().slice(0, 10);

  let query = supabase
    .from("employee_documents")
    .select(
      "id, employee_id, document_type, expires_at, created_at, folder_id, file_id, employees(full_name, email, employee_number), file_objects(file_name, deleted_at), document_folders(name)",
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (filters.employeeId) query = query.eq("employee_id", filters.employeeId);
  if (filters.documentType) query = query.ilike("document_type", filters.documentType);
  if (filters.folderId) query = query.eq("folder_id", filters.folderId);

  const { data, error } = await query.limit(500);
  if (error) throw new Error(error.message);

  let rows = (data ?? [])
    .map((row) => mapDocumentRow(row as RawDocumentRow))
    .filter((row): row is HrDocumentRow => row !== null)
    .filter((row) => matchesStatus(row, filters.status, today));

  if (filters.search) {
    const needle = filters.search.toLowerCase();
    rows = rows.filter(
      (row) =>
        row.employeeName.toLowerCase().includes(needle) ||
        row.employeeNumber.toLowerCase().includes(needle) ||
        row.documentType.toLowerCase().includes(needle) ||
        row.fileName.toLowerCase().includes(needle),
    );
  }

  const total = rows.length;
  const page = filters.page;
  const start = (page - 1) * PAGE_SIZE;
  rows = rows.slice(start, start + PAGE_SIZE);

  return { rows, total, page, pageSize: PAGE_SIZE };
}

export async function listEmployeeDocuments(): Promise<HrDocumentRow[]> {
  const result = await listDocumentLibrary({
    status: "all",
    page: 1,
  });
  return result.rows;
}

export async function listEmployeeDocumentsForProfile(employeeId: string): Promise<HrDocumentRow[]> {
  await requireRole("hr_administrator");
  const result = await listDocumentLibrary({
    employeeId,
    status: "all",
    page: 1,
  });
  return result.rows;
}

export async function listRequiredDocuments(activeOnly = false): Promise<RequiredDocumentRow[]> {
  await requireRole("hr_administrator");
  const supabase = await createClient();

  let query = supabase
    .from("required_documents")
    .select("id, name, description, requires_expiry, warning_days, is_active, sort_order")
    .eq("organization_id", getOrganizationId())
    .order("sort_order")
    .order("name");

  if (activeOnly) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    requiresExpiry: row.requires_expiry,
    warningDays: row.warning_days,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  }));
}

export async function createRequiredDocument(input: {
  name: string;
  description?: string | null;
  requiresExpiry: boolean;
  warningDays: number;
  isActive: boolean;
  sortOrder: number;
}): Promise<void> {
  await requireRole("hr_administrator");
  const supabase = await createClient();

  const { error } = await supabase.from("required_documents").insert({
    organization_id: getOrganizationId(),
    name: input.name,
    description: input.description ?? null,
    requires_expiry: input.requiresExpiry,
    warning_days: input.warningDays,
    is_active: input.isActive,
    sort_order: input.sortOrder,
  });

  if (error) throw new Error(error.message);
}

export async function updateRequiredDocument(
  id: string,
  input: {
    name: string;
    description?: string | null;
    requiresExpiry: boolean;
    warningDays: number;
    isActive: boolean;
    sortOrder: number;
  },
): Promise<void> {
  await requireRole("hr_administrator");
  const supabase = await createClient();

  const { error } = await supabase
    .from("required_documents")
    .update({
      name: input.name,
      description: input.description ?? null,
      requires_expiry: input.requiresExpiry,
      warning_days: input.warningDays,
      is_active: input.isActive,
      sort_order: input.sortOrder,
    })
    .eq("id", id)
    .eq("organization_id", getOrganizationId());

  if (error) throw new Error(error.message);
}

export async function deleteRequiredDocument(id: string): Promise<void> {
  await requireRole("hr_administrator");
  const supabase = await createClient();

  const { error } = await supabase
    .from("required_documents")
    .delete()
    .eq("id", id)
    .eq("organization_id", getOrganizationId());

  if (error) throw new Error(error.message);
}

type ExistingEmployeeDocumentRow = {
  id: string;
  file_id: string;
  expires_at: string | null;
  document_type: string;
};

export async function saveEmployeeDocument(input: {
  organizationId: string;
  employeeId: string;
  documentType: string;
  fileId: string;
  folderId?: string | null;
  expiresAt?: string | null;
}): Promise<{ id: string; replaced: boolean }> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: requiredRows, error: requiredError } = await supabase
    .from("required_documents")
    .select("name, requires_expiry, warning_days")
    .eq("organization_id", input.organizationId)
    .eq("is_active", true);

  if (requiredError) throw new Error(requiredError.message);

  const required = (requiredRows ?? []).find((row) => documentTypesMatch(row.name, input.documentType));

  const { data: existingRows, error: findError } = await supabase
    .from("employee_documents")
    .select("id, file_id, expires_at, created_at, document_type, file_objects(deleted_at)")
    .eq("organization_id", input.organizationId)
    .eq("employee_id", input.employeeId)
    .order("created_at", { ascending: false });

  if (findError) throw new Error(findError.message);

  const existing = (existingRows ?? []).find((row) => {
    const file = Array.isArray(row.file_objects) ? row.file_objects[0] : row.file_objects;
    if (file?.deleted_at) return false;
    return documentTypesMatch(row.document_type, input.documentType);
  }) as (ExistingEmployeeDocumentRow & { file_objects: unknown }) | undefined;

  const decision = employeeDocumentUploadDecision({
    existing: existing ? { expiresAt: existing.expires_at } : null,
    required: required
      ? { requiresExpiry: required.requires_expiry, warningDays: required.warning_days }
      : null,
    today,
  });

  const documentType = required?.name ?? input.documentType;

  if (decision === "deny") {
    throw new Error(
      `This employee already has a ${documentType} document. Delete the existing one before uploading again.`,
    );
  }

  if (decision === "replace" && existing) {
    const previousFileId = existing.file_id;

    const { data: updated, error: updateError } = await supabase
      .from("employee_documents")
      .update({
        file_id: input.fileId,
        folder_id: input.folderId ?? null,
        expires_at: input.expiresAt ?? null,
        document_type: documentType,
      })
      .eq("id", existing.id)
      .select("id")
      .single();

    if (updateError) throw new Error(updateError.message);

    const { hardDeleteOrganizationFile } = await import("@/lib/files/storage");
    await hardDeleteOrganizationFile(previousFileId);

    return { id: updated.id, replaced: true };
  }

  const { data, error } = await supabase
    .from("employee_documents")
    .insert({
      organization_id: input.organizationId,
      employee_id: input.employeeId,
      document_type: documentType,
      file_id: input.fileId,
      folder_id: input.folderId ?? null,
      expires_at: input.expiresAt ?? null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return { id: data.id, replaced: false };
}

export async function attachEmployeeDocument(input: {
  employeeId: string;
  documentType: string;
  fileId: string;
  folderId?: string | null;
  expiresAt?: string | null;
}): Promise<{ id: string; replaced: boolean }> {
  await requireRole("hr_administrator");

  return saveEmployeeDocument({
    organizationId: getOrganizationId(),
    employeeId: input.employeeId,
    documentType: input.documentType,
    fileId: input.fileId,
    folderId: input.folderId,
    expiresAt: input.expiresAt,
  });
}

export async function deleteEmployeeDocument(
  documentId: string,
  actorUserId?: string | null,
): Promise<void> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  const { data, error } = await supabase
    .from("employee_documents")
    .select("file_id, employee_id, document_type")
    .eq("id", documentId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return;

  const fileId = data.file_id;

  const { error: deleteLinkError } = await supabase
    .from("employee_documents")
    .delete()
    .eq("id", documentId)
    .eq("organization_id", organizationId);

  if (deleteLinkError) throw new Error(deleteLinkError.message);

  const { hardDeleteOrganizationFile } = await import("@/lib/files/storage");
  await hardDeleteOrganizationFile(fileId);

  if (actorUserId) {
    const { logDocumentEvent } = await import("@/lib/audit/log-document-event");
    await logDocumentEvent({
      organizationId,
      actorUserId,
      action: "document.deleted",
      documentId,
      metadata: {
        employeeId: data.employee_id,
        documentType: data.document_type,
      },
    });
  }
}

export async function getDocumentsHubStats(): Promise<DocumentsHubStats> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = getOrganizationId();
  const today = new Date().toISOString().slice(0, 10);

  const [documentsResult, foldersResult, requiredResult, matrix] = await Promise.all([
    listDocumentLibrary({ status: "all", page: 1 }),
    supabase
      .from("document_folders")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    listRequiredDocuments(true),
    buildComplianceMatrix(),
  ]);

  const expiringCount = documentsResult.rows.filter((row) =>
    matchesStatus(row, "expiring", today),
  ).length;

  const missingComplianceCount = matrix.reduce(
    (count, row) =>
      count + row.cells.filter((cell) => cell.status === "missing" || cell.status === "expired").length,
    0,
  );

  return {
    totalDocuments: documentsResult.total,
    expiringCount,
    missingComplianceCount,
    folderCount: foldersResult.count ?? 0,
    requiredTypeCount: requiredResult.length,
    recentDocuments: documentsResult.rows.slice(0, 5),
  };
}

export async function buildComplianceMatrix(): Promise<ComplianceMatrixRow[]> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = getOrganizationId();
  const today = new Date().toISOString().slice(0, 10);

  const [employeesResult, requiredResult, documentsResult] = await Promise.all([
    supabase
      .from("employees")
      .select("id, full_name, employee_number")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .order("full_name"),
    listRequiredDocuments(true),
    supabase
      .from("employee_documents")
      .select("employee_id, document_type, expires_at, created_at, file_objects(deleted_at)")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
  ]);

  if (employeesResult.error) throw new Error(employeesResult.error.message);
  if (documentsResult.error) throw new Error(documentsResult.error.message);

  const docsByEmployee = new Map<string, Array<{ documentType: string; expiresAt: string | null }>>();

  for (const row of documentsResult.data ?? []) {
    const file = Array.isArray(row.file_objects) ? row.file_objects[0] : row.file_objects;
    if (file?.deleted_at) continue;

    const list = docsByEmployee.get(row.employee_id) ?? [];
    list.push({ documentType: row.document_type, expiresAt: row.expires_at });
    docsByEmployee.set(row.employee_id, list);
  }

  return (employeesResult.data ?? []).map((employee) => ({
    employeeId: employee.id,
    employeeName: employee.full_name,
    employeeNumber: employee.employee_number,
    cells: requiredResult.map((required) => {
      const matches = (docsByEmployee.get(employee.id) ?? []).filter((doc) =>
        documentTypesMatch(doc.documentType, required.name),
      );
      const latest = matches[0] ?? null;
      const status = resolveDocumentCompliance({
        required: {
          requiresExpiry: required.requiresExpiry,
          warningDays: required.warningDays,
        },
        document: latest ? { expiresAt: latest.expiresAt } : null,
        today,
      });

      return {
        requiredDocumentId: required.id,
        requiredDocumentName: required.name,
        status,
        expiresAt: latest?.expiresAt ?? null,
      };
    }),
  }));
}

export async function listUploadableRequiredTypesForEmployee(
  employeeId: string,
): Promise<RequiredDocumentRow[]> {
  const required = await listRequiredDocuments(true);
  const matrix = await buildComplianceMatrix();
  const employeeRow = matrix.find((row) => row.employeeId === employeeId);
  if (!employeeRow) return required;

  const uploadableNames = new Set(
    employeeRow.cells
      .filter((cell) => cell.status === "missing" || cell.status === "expired")
      .map((cell) => cell.requiredDocumentName.toLowerCase()),
  );

  return required.filter((row) => uploadableNames.has(row.name.toLowerCase()));
}

export type ComplianceWatchRow = {
  id: string;
  dateLabel: string;
  title: string;
  subtitle: string;
};

export async function getComplianceWatchRows(): Promise<{
  rows: ComplianceWatchRow[];
  issuesCount: number;
}> {
  const matrix = await buildComplianceMatrix();
  const rows: ComplianceWatchRow[] = [];

  for (const employee of matrix) {
    for (const cell of employee.cells) {
      if (cell.status !== "missing" && cell.status !== "expired" && cell.status !== "expiring") {
        continue;
      }

      const statusLabel =
        cell.status === "missing"
          ? "Missing"
          : cell.status === "expired"
            ? "Expired"
            : "Expiring soon";

      rows.push({
        id: `${employee.employeeId}-${cell.requiredDocumentId}`,
        dateLabel: cell.expiresAt
          ? new Date(cell.expiresAt).toLocaleDateString("en-MY", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "—",
        title: `${employee.employeeName} — ${cell.requiredDocumentName}`,
        subtitle: statusLabel,
      });
    }
  }

  rows.sort((a, b) => {
    if (a.subtitle === "Expired" && b.subtitle !== "Expired") return -1;
    if (b.subtitle === "Expired" && a.subtitle !== "Expired") return 1;
    if (a.subtitle === "Missing" && b.subtitle === "Expiring soon") return -1;
    if (b.subtitle === "Missing" && a.subtitle === "Expiring soon") return 1;
    return a.title.localeCompare(b.title);
  });

  return {
    rows: rows.slice(0, 8),
    issuesCount: rows.length,
  };
}
