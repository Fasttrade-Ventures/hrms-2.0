import { createClient } from "@/lib/supabase/server";

import { getOrganizationIdForReports, listReportEmployees, paginateRows } from "./context";
import type { ReportFilters } from "./types";

export type AttendanceDailyReportRow = Record<string, string | number | null>;

export async function listAttendanceDailyRows(filters: ReportFilters): Promise<{
  columns: { key: string; label: string }[];
  rows: AttendanceDailyReportRow[];
  total: number;
}> {
  const supabase = await createClient();
  const organizationId = getOrganizationIdForReports();
  const employees = await listReportEmployees(filters);
  const employeeIds = employees.map((employee) => employee.id);
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));

  if (!employeeIds.length) {
    return {
      columns: [
        { key: "employeeNumber", label: "Employee #" },
        { key: "employeeName", label: "Employee" },
        { key: "workDate", label: "Date" },
        { key: "session", label: "Session" },
        { key: "clockIn", label: "Clock in" },
        { key: "clockOut", label: "Clock out" },
        { key: "status", label: "Status" },
        { key: "branch", label: "Branch" },
        { key: "department", label: "Department" },
      ],
      rows: [],
      total: 0,
    };
  }

  const { data, error } = await supabase
    .from("attendance_records")
    .select("employee_id, work_date, session, clock_in_at, clock_out_at, status")
    .eq("organization_id", organizationId)
    .in("employee_id", employeeIds)
    .gte("work_date", filters.from)
    .lte("work_date", filters.to)
    .order("work_date", { ascending: false })
    .limit(5000);

  if (error) throw new Error(error.message);

  const flatRows: AttendanceDailyReportRow[] = (data ?? []).map((row) => {
    const employee = employeeById.get(row.employee_id)!;
    return {
      employeeNumber: employee.employeeNumber,
      employeeName: employee.fullName,
      workDate: row.work_date,
      session: row.session,
      clockIn: row.clock_in_at ? new Date(row.clock_in_at).toLocaleString("en-MY") : null,
      clockOut: row.clock_out_at ? new Date(row.clock_out_at).toLocaleString("en-MY") : null,
      status: row.status,
      branch: employee.branchName,
      department: employee.departmentName,
    };
  });

  const { rows, total } = paginateRows(flatRows, filters);
  return {
    columns: [
      { key: "employeeNumber", label: "Employee #" },
      { key: "employeeName", label: "Employee" },
      { key: "workDate", label: "Date" },
      { key: "session", label: "Session" },
      { key: "clockIn", label: "Clock in" },
      { key: "clockOut", label: "Clock out" },
      { key: "status", label: "Status" },
      { key: "branch", label: "Branch" },
      { key: "department", label: "Department" },
    ],
    rows,
    total,
  };
}
