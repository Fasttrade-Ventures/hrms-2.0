import { requireReportRunnerAccess } from "@/lib/reports/access";
import { createClient } from "@/lib/supabase/server";

import type { ReportFilters } from "./types";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export type FilterOption = { id: string; name: string };

export async function loadReportFilterOptions(): Promise<{
  branches: FilterOption[];
  departments: FilterOption[];
}> {
  await requireReportRunnerAccess();
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  const [branchesRes, departmentsRes] = await Promise.all([
    supabase.from("branches").select("id, name").eq("organization_id", organizationId).order("name"),
    supabase.from("departments").select("id, name").eq("organization_id", organizationId).order("name"),
  ]);

  if (branchesRes.error) throw new Error(branchesRes.error.message);
  if (departmentsRes.error) throw new Error(departmentsRes.error.message);

  return {
    branches: (branchesRes.data ?? []).map((row) => ({ id: row.id, name: row.name })),
    departments: (departmentsRes.data ?? []).map((row) => ({ id: row.id, name: row.name })),
  };
}

export type ReportEmployee = {
  id: string;
  employeeNumber: string;
  fullName: string;
  branchName: string | null;
  departmentName: string | null;
  status: string;
  employmentType: string | null;
  joinDate: string;
};

export const REPORT_EXPORT_ROW_CAP = 5000;

async function loadOnLeaveEmployeeIds(organizationId: string, asOf: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leave_requests")
    .select("employee_id")
    .eq("organization_id", organizationId)
    .eq("status", "approved")
    .lte("start_date", asOf)
    .gte("end_date", asOf);

  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((row) => row.employee_id));
}

export async function listReportEmployees(filters: ReportFilters): Promise<ReportEmployee[]> {
  await requireReportRunnerAccess();
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  let query = supabase
    .from("employees")
    .select(
      "id, employee_number, full_name, status, employment_type, join_date, branch_id, department_id, branches(name), departments(name)",
    )
    .eq("organization_id", organizationId)
    .order("employee_number");

  if (filters.branchId) query = query.eq("branch_id", filters.branchId);
  if (filters.departmentId) query = query.eq("department_id", filters.departmentId);

  if (filters.employmentStatus === "active") {
    query = query.eq("status", "active");
  } else if (filters.employmentStatus === "inactive") {
    query = query.eq("status", "inactive");
  } else if (filters.employmentStatus !== "on_leave") {
    query = query.neq("status", "terminated");
  } else {
    query = query.eq("status", "active");
  }

  const { data, error } = await query.limit(REPORT_EXPORT_ROW_CAP);
  if (error) throw new Error(error.message);

  const onLeaveIds =
    filters.employmentStatus === "on_leave"
      ? await loadOnLeaveEmployeeIds(organizationId, filters.asOf)
      : null;

  const q = filters.employeeQuery?.toLowerCase();
  let rows = (data ?? []).map((row) => ({
    id: row.id,
    employeeNumber: row.employee_number,
    fullName: row.full_name ?? row.employee_number,
    branchName: (row.branches as { name?: string } | null)?.name ?? null,
    departmentName: (row.departments as { name?: string } | null)?.name ?? null,
    status: row.status,
    employmentType: row.employment_type,
    joinDate: row.join_date,
  }));

  if (onLeaveIds) {
    rows = rows.filter((row) => onLeaveIds.has(row.id));
  }

  if (q) {
    rows = rows.filter(
      (row) =>
        row.fullName.toLowerCase().includes(q) ||
        row.employeeNumber.toLowerCase().includes(q),
    );
  }

  return rows;
}

export function paginateRows<T>(rows: T[], filters: ReportFilters): { rows: T[]; total: number } {
  const total = rows.length;
  const start = (filters.page - 1) * filters.pageSize;
  return { rows: rows.slice(start, start + filters.pageSize), total };
}

export function buildFilterSummary(filters: ReportFilters): string {
  const parts: string[] = [];
  if (filters.preset !== "custom") {
    parts.push(`Preset: ${filters.preset.replace(/_/g, " ")}`);
  }
  parts.push(`${filters.from} to ${filters.to}`);
  if (filters.asOf) parts.push(`As of ${filters.asOf}`);
  if (filters.branchId) parts.push(`Branch filter applied`);
  if (filters.departmentId) parts.push(`Department filter applied`);
  if (filters.employmentStatus !== "all") parts.push(`Status: ${filters.employmentStatus}`);
  if (filters.employeeQuery) parts.push(`Search: ${filters.employeeQuery}`);
  return parts.join(" · ");
}

export function getOrganizationIdForReports(): string {
  return getOrganizationId();
}
