import { money } from "@hrms/domain";

import type { EmployeePayInput } from "./shared";

/** Sum clocked hours for hourly-basis employees in the earning period. */
export async function fetchAttendanceHoursForPeriod(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  organizationId: string,
  periodStart: string,
  periodEnd: string,
  employees: EmployeePayInput[],
): Promise<Map<string, number>> {
  const hourlyIds = employees.filter((employee) => employee.payBasis === "hourly").map((e) => e.employeeId);
  const hoursByEmployee = new Map<string, number>();
  if (hourlyIds.length === 0) return hoursByEmployee;

  const { data, error } = await supabase
    .from("attendance_records")
    .select("employee_id, clock_in_at, clock_out_at")
    .eq("organization_id", organizationId)
    .gte("work_date", periodStart)
    .lte("work_date", periodEnd)
    .in("employee_id", hourlyIds);

  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    if (!row.clock_in_at || !row.clock_out_at) continue;
    const hours =
      (new Date(row.clock_out_at).getTime() - new Date(row.clock_in_at).getTime()) / 3_600_000;
    if (hours <= 0) continue;
    hoursByEmployee.set(row.employee_id, (hoursByEmployee.get(row.employee_id) ?? 0) + hours);
  }

  return hoursByEmployee;
}

export function hourlyPayFromAttendance(
  hours: number,
  hourlyRate: number | null | undefined,
): number {
  if (!hourlyRate || hours <= 0) return 0;
  return money(hours).mul(hourlyRate).toNumber();
}
