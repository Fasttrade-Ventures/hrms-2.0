import { createClient } from "@/lib/supabase/server";

import { getOrganizationIdForReports, listReportEmployees, paginateRows } from "./context";
import type { ReportFilters } from "./types";

export type AttendanceSummaryReportRow = Record<string, string | number | null>;

function hoursBetween(clockIn: string, clockOut: string): number {
  const start = Date.parse(clockIn);
  const end = Date.parse(clockOut);
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  return Math.round(((end - start) / 3_600_000) * 100) / 100;
}

export async function listAttendanceSummaryRows(filters: ReportFilters): Promise<{
  columns: { key: string; label: string }[];
  rows: AttendanceSummaryReportRow[];
  total: number;
}> {
  const supabase = await createClient();
  const organizationId = getOrganizationIdForReports();
  const employees = await listReportEmployees(filters);
  const employeeIds = employees.map((employee) => employee.id);

  const { data, error } = employeeIds.length
    ? await supabase
        .from("attendance_records")
        .select("employee_id, work_date, clock_in_at, clock_out_at, status")
        .eq("organization_id", organizationId)
        .in("employee_id", employeeIds)
        .gte("work_date", filters.from)
        .lte("work_date", filters.to)
    : { data: [], error: null };

  if (error) throw new Error(error.message);

  const byEmployee = new Map<
    string,
    { present: number; absent: number; late: number; hours: number }
  >();

  for (const employee of employees) {
    byEmployee.set(employee.id, { present: 0, absent: 0, late: 0, hours: 0 });
  }

  for (const row of data ?? []) {
    const bucket = byEmployee.get(row.employee_id);
    if (!bucket) continue;

    if (row.clock_in_at) {
      bucket.present += 1;
      if (row.clock_out_at) {
        bucket.hours += hoursBetween(row.clock_in_at, row.clock_out_at);
      }
    } else if (row.status === "absent") {
      bucket.absent += 1;
    }

    if (row.status === "late") bucket.late += 1;
  }

  const flatRows: AttendanceSummaryReportRow[] = employees.map((employee) => {
    const bucket = byEmployee.get(employee.id) ?? { present: 0, absent: 0, late: 0, hours: 0 };
    return {
      employeeNumber: employee.employeeNumber,
      employeeName: employee.fullName,
      branch: employee.branchName,
      department: employee.departmentName,
      daysPresent: bucket.present,
      daysAbsent: bucket.absent,
      daysLate: bucket.late,
      totalHours: Math.round(bucket.hours * 100) / 100,
    };
  });

  const { rows, total } = paginateRows(flatRows, filters);
  return {
    columns: [
      { key: "employeeNumber", label: "Employee #" },
      { key: "employeeName", label: "Employee" },
      { key: "branch", label: "Branch" },
      { key: "department", label: "Department" },
      { key: "daysPresent", label: "Present" },
      { key: "daysAbsent", label: "Absent" },
      { key: "daysLate", label: "Late" },
      { key: "totalHours", label: "Total hours" },
    ],
    rows,
    total,
  };
}
