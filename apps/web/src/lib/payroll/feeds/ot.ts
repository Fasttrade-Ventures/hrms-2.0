import { computeOtPay, money } from "@hrms/domain";

import type { EmployeePayInput } from "./shared";

type OtRow = { employee_id: string; hours: number; rate_type: string };

export function aggregateOtPayByEmployee(
  rows: OtRow[],
  employees: EmployeePayInput[],
): Map<string, number> {
  const otByEmployee = new Map<string, number>();
  for (const row of rows) {
    const multiplier = Number(row.rate_type);
    const basic = employees.find((employee) => employee.employeeId === row.employee_id)?.monthlyBasic ?? 0;
    const pay = computeOtPay(Number(row.hours), multiplier, money(basic)).toNumber();
    otByEmployee.set(row.employee_id, (otByEmployee.get(row.employee_id) ?? 0) + pay);
  }
  return otByEmployee;
}

export async function fetchApprovedOtForPeriod(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  organizationId: string,
  periodStart: string,
  periodEnd: string,
  employeeIds: string[],
) {
  if (employeeIds.length === 0) return [];
  const { data, error } = await supabase
    .from("overtime_requests")
    .select("employee_id, hours, rate_type")
    .eq("organization_id", organizationId)
    .eq("status", "approved")
    .gte("work_date", periodStart)
    .lte("work_date", periodEnd)
    .in("employee_id", employeeIds);
  if (error) throw new Error(error.message);
  return data ?? [];
}
