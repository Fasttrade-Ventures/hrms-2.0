import { createClient } from "@/lib/supabase/server";

import { getOrganizationIdForReports, listReportEmployees, paginateRows } from "./context";
import type { ReportFilters } from "./types";

export type ClaimsOtReportRow = Record<string, string | number | null>;

export async function listClaimsOtRows(filters: ReportFilters): Promise<{
  columns: { key: string; label: string }[];
  rows: ClaimsOtReportRow[];
  total: number;
}> {
  const supabase = await createClient();
  const organizationId = getOrganizationIdForReports();
  const employees = await listReportEmployees(filters);
  const employeeIds = new Set(employees.map((employee) => employee.id));
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));

  const [claimsRes, otRes] = await Promise.all([
    supabase
      .from("claims")
      .select("id, employee_id, amount, receipt_date, status, description, claim_types(name)")
      .eq("organization_id", organizationId)
      .gte("receipt_date", filters.from)
      .lte("receipt_date", filters.to)
      .order("receipt_date", { ascending: false })
      .limit(2500),
    supabase
      .from("overtime_requests")
      .select("id, employee_id, work_date, hours, rate_type, status, reason")
      .eq("organization_id", organizationId)
      .gte("work_date", filters.from)
      .lte("work_date", filters.to)
      .order("work_date", { ascending: false })
      .limit(2500),
  ]);

  if (claimsRes.error) throw new Error(claimsRes.error.message);
  if (otRes.error) throw new Error(otRes.error.message);

  const claimRows: ClaimsOtReportRow[] = (claimsRes.data ?? [])
    .filter((row) => employeeIds.has(row.employee_id))
    .map((row) => {
      const employee = employeeById.get(row.employee_id)!;
      return {
        kind: "Claim",
        employeeNumber: employee.employeeNumber,
        employeeName: employee.fullName,
        date: row.receipt_date,
        description:
          row.description ??
          (row.claim_types as { name?: string } | null)?.name ??
          "Claim",
        amountOrHours: Number(row.amount),
        status: row.status,
      };
    });

  const otRows: ClaimsOtReportRow[] = (otRes.data ?? [])
    .filter((row) => employeeIds.has(row.employee_id))
    .map((row) => {
      const employee = employeeById.get(row.employee_id)!;
      return {
        kind: "Overtime",
        employeeNumber: employee.employeeNumber,
        employeeName: employee.fullName,
        date: row.work_date,
        description: row.reason ?? `OT ${row.rate_type}x`,
        amountOrHours: Number(row.hours),
        status: row.status,
      };
    });

  const flatRows = [...claimRows, ...otRows].sort((a, b) =>
    String(b.date).localeCompare(String(a.date)),
  );

  const { rows, total } = paginateRows(flatRows, filters);
  return {
    columns: [
      { key: "kind", label: "Type" },
      { key: "employeeNumber", label: "Employee #" },
      { key: "employeeName", label: "Employee" },
      { key: "date", label: "Date" },
      { key: "description", label: "Description" },
      { key: "amountOrHours", label: "Amount / hours" },
      { key: "status", label: "Status" },
    ],
    rows,
    total,
  };
}
