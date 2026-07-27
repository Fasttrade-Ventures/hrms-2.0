export async function fetchUnpaidLeaveDaysForPeriod(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  organizationId: string,
  periodStart: string,
  periodEnd: string,
  employeeIds: string[],
): Promise<Map<string, number>> {
  const unpaidByEmployee = new Map<string, number>();
  if (employeeIds.length === 0) return unpaidByEmployee;

  const { data, error } = await supabase
    .from("leave_requests")
    .select("employee_id, days, leave_types(is_unpaid)")
    .eq("organization_id", organizationId)
    .eq("status", "approved")
    .lte("start_date", periodEnd)
    .gte("end_date", periodStart)
    .in("employee_id", employeeIds);

  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    const leaveType = (
      Array.isArray(row.leave_types) ? row.leave_types[0] : row.leave_types
    ) as { is_unpaid?: boolean } | null;
    if (!leaveType?.is_unpaid) continue;
    unpaidByEmployee.set(
      row.employee_id,
      (unpaidByEmployee.get(row.employee_id) ?? 0) + Number(row.days),
    );
  }

  return unpaidByEmployee;
}
