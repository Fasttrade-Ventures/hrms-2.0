import { createClient } from "@/lib/supabase/server";

import { getOrganizationIdForReports, listReportEmployees, paginateRows } from "./context";
import type { ReportFilters } from "./types";

export type PerformanceSnapshotReportRow = Record<string, string | number | null>;

export async function listPerformanceSnapshotRows(filters: ReportFilters): Promise<{
  columns: { key: string; label: string }[];
  rows: PerformanceSnapshotReportRow[];
  total: number;
}> {
  const supabase = await createClient();
  const organizationId = getOrganizationIdForReports();
  const employees = await listReportEmployees(filters);
  const employeeIds = new Set(employees.map((employee) => employee.id));
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));

  let query = supabase
    .from("performance_appraisals")
    .select(
      "id, employee_id, status, self_rating, manager_rating, review_cycle_id, review_cycles(name, period_start, period_end)",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (filters.reviewCycleId) {
    query = query.eq("review_cycle_id", filters.reviewCycleId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const flatRows: PerformanceSnapshotReportRow[] = (data ?? [])
    .filter((row) => employeeIds.has(row.employee_id))
    .map((row) => {
      const employee = employeeById.get(row.employee_id)!;
      const cycle = row.review_cycles as {
        name?: string;
        period_start?: string;
        period_end?: string;
      } | null;
      return {
        employeeNumber: employee.employeeNumber,
        employeeName: employee.fullName,
        cycleName: cycle?.name ?? "Review cycle",
        cyclePeriod:
          cycle?.period_start && cycle?.period_end
            ? `${cycle.period_start} – ${cycle.period_end}`
            : null,
        status: row.status,
        selfRating: row.self_rating,
        managerRating: row.manager_rating,
      };
    });

  const { rows, total } = paginateRows(flatRows, filters);
  return {
    columns: [
      { key: "employeeNumber", label: "Employee #" },
      { key: "employeeName", label: "Employee" },
      { key: "cycleName", label: "Cycle" },
      { key: "cyclePeriod", label: "Cycle period" },
      { key: "status", label: "Appraisal status" },
      { key: "selfRating", label: "Self rating" },
      { key: "managerRating", label: "Manager rating" },
    ],
    rows,
    total,
  };
}
