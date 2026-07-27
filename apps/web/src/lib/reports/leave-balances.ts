import { createClient } from "@/lib/supabase/server";

import { getOrganizationIdForReports, listReportEmployees, paginateRows } from "./context";
import type { ReportFilters } from "./types";

export type LeaveBalanceReportRow = Record<string, string | number | null>;

export async function listLeaveBalanceRows(filters: ReportFilters): Promise<{
  columns: { key: string; label: string }[];
  rows: LeaveBalanceReportRow[];
  total: number;
}> {
  const supabase = await createClient();
  const organizationId = getOrganizationIdForReports();
  const employees = await listReportEmployees(filters);
  const employeeIds = employees.map((employee) => employee.id);

  const yearStart = `${filters.asOf.slice(0, 4)}-01-01`;

  const [typesRes, requestsRes] = await Promise.all([
    supabase
      .from("leave_types")
      .select("id, name, entitlement_days, is_unpaid")
      .eq("organization_id", organizationId)
      .order("name"),
    employeeIds.length
      ? supabase
          .from("leave_requests")
          .select("employee_id, leave_type_id, days, status")
          .eq("organization_id", organizationId)
          .in("employee_id", employeeIds)
          .in("status", ["pending", "approved"])
          .gte("start_date", yearStart)
          .lte("start_date", filters.asOf)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (typesRes.error) throw new Error(typesRes.error.message);
  if (requestsRes.error) throw new Error(requestsRes.error.message);

  const leaveTypes = typesRes.data ?? [];
  const requests = requestsRes.data ?? [];

  const flatRows: LeaveBalanceReportRow[] = [];

  for (const employee of employees) {
    for (const leaveType of leaveTypes) {
      const matching = requests.filter(
        (row) => row.employee_id === employee.id && row.leave_type_id === leaveType.id,
      );
      const usedDays = matching
        .filter((row) => row.status === "approved")
        .reduce((sum, row) => sum + Number(row.days), 0);
      const pendingDays = matching
        .filter((row) => row.status === "pending")
        .reduce((sum, row) => sum + Number(row.days), 0);
      const entitlementDays = Number(leaveType.entitlement_days);
      const remainingDays = leaveType.is_unpaid
        ? null
        : Math.max(0, entitlementDays - usedDays - pendingDays);

      flatRows.push({
        employeeNumber: employee.employeeNumber,
        employeeName: employee.fullName,
        branch: employee.branchName,
        department: employee.departmentName,
        leaveType: leaveType.name,
        entitlementDays,
        usedDays,
        pendingDays,
        remainingDays,
      });
    }
  }

  const { rows, total } = paginateRows(flatRows, filters);
  return {
    columns: [
      { key: "employeeNumber", label: "Employee #" },
      { key: "employeeName", label: "Employee" },
      { key: "branch", label: "Branch" },
      { key: "department", label: "Department" },
      { key: "leaveType", label: "Leave type" },
      { key: "entitlementDays", label: "Entitlement" },
      { key: "usedDays", label: "Used" },
      { key: "pendingDays", label: "Pending" },
      { key: "remainingDays", label: "Remaining" },
    ],
    rows,
    total,
  };
}
