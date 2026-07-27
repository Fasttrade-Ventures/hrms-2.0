import { createClient } from "@/lib/supabase/server";

import { getOrganizationIdForReports, listReportEmployees, paginateRows } from "./context";
import type { ReportFilters } from "./types";

export type LeaveUsageReportRow = Record<string, string | number | null>;

export async function listLeaveUsageRows(filters: ReportFilters): Promise<{
  columns: { key: string; label: string }[];
  rows: LeaveUsageReportRow[];
  total: number;
}> {
  const supabase = await createClient();
  const organizationId = getOrganizationIdForReports();
  const employees = await listReportEmployees(filters);
  const employeeIds = new Set(employees.map((employee) => employee.id));
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));

  const { data, error } = await supabase
    .from("leave_requests")
    .select("id, employee_id, start_date, end_date, days, status, leave_types(name)")
    .eq("organization_id", organizationId)
    .in("status", ["pending", "approved"])
    .lte("start_date", filters.to)
    .gte("end_date", filters.from)
    .order("start_date", { ascending: false })
    .limit(5000);

  if (error) throw new Error(error.message);

  const flatRows: LeaveUsageReportRow[] = (data ?? [])
    .filter((row) => employeeIds.has(row.employee_id))
    .map((row) => {
      const employee = employeeById.get(row.employee_id)!;
      return {
        employeeNumber: employee.employeeNumber,
        employeeName: employee.fullName,
        leaveType: (row.leave_types as { name?: string } | null)?.name ?? "Leave",
        startDate: row.start_date,
        endDate: row.end_date,
        days: Number(row.days),
        status: row.status,
      };
    });

  const { rows, total } = paginateRows(flatRows, filters);
  return {
    columns: [
      { key: "employeeNumber", label: "Employee #" },
      { key: "employeeName", label: "Employee" },
      { key: "leaveType", label: "Leave type" },
      { key: "startDate", label: "Start" },
      { key: "endDate", label: "End" },
      { key: "days", label: "Days" },
      { key: "status", label: "Status" },
    ],
    rows,
    total,
  };
}
