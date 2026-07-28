import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export type RosterEntryRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  shiftId: string;
  shiftName: string;
  shiftStart: string;
  shiftEnd: string;
  workDate: string;
  notes: string | null;
};

function startOfWeek(date: Date): string {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy.toISOString().slice(0, 10);
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getWeekDates(weekStart?: string): string[] {
  const start = weekStart ?? startOfWeek(new Date());
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export async function listRosterWeek(input: {
  weekStart?: string;
  branchId?: string;
}): Promise<{ weekStart: string; weekDates: string[]; entries: RosterEntryRow[] }> {
  await requireRole("hr_administrator");
  const organizationId = getOrganizationId();
  const weekStart = input.weekStart ?? startOfWeek(new Date());
  const weekDates = getWeekDates(weekStart);
  const weekEnd = weekDates[6];
  const supabase = await createClient();

  let employeeQuery = supabase
    .from("employees")
    .select("id, full_name, employee_number, branch_id")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("full_name");

  if (input.branchId) {
    employeeQuery = employeeQuery.eq("branch_id", input.branchId);
  }

  const [{ data: employees, error: employeeError }, { data: entries, error: entryError }] =
    await Promise.all([
      employeeQuery,
      supabase
        .from("roster_entries")
        .select("id, employee_id, shift_id, work_date, notes, shifts(name, start_time, end_time)")
        .eq("organization_id", organizationId)
        .gte("work_date", weekStart)
        .lte("work_date", weekEnd),
    ]);

  if (employeeError) throw new Error(employeeError.message);
  if (entryError) throw new Error(entryError.message);

  const employeeById = new Map((employees ?? []).map((row) => [row.id, row]));
  const mapped = (entries ?? [])
    .map((row) => {
      const employee = employeeById.get(row.employee_id);
      const shift = Array.isArray(row.shifts) ? row.shifts[0] : row.shifts;
      if (!employee || !shift) return null;
      return {
        id: row.id,
        employeeId: row.employee_id,
        employeeName: employee.full_name ?? employee.employee_number ?? "Employee",
        employeeNumber: employee.employee_number ?? "—",
        shiftId: row.shift_id,
        shiftName: shift.name,
        shiftStart: shift.start_time,
        shiftEnd: shift.end_time,
        workDate: row.work_date,
        notes: row.notes,
      } satisfies RosterEntryRow;
    })
    .filter((row): row is RosterEntryRow => row !== null);

  return { weekStart, weekDates, entries: mapped };
}

export async function listEmployeeRosterSchedule(days = 14): Promise<RosterEntryRow[]> {
  const { requireEmployeeContext } = await import("@/lib/employee/leave");
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();
  const start = new Date().toISOString().slice(0, 10);
  const end = addDays(start, days - 1);

  const { data, error } = await supabase
    .from("roster_entries")
    .select("id, employee_id, shift_id, work_date, notes, shifts(name, start_time, end_time)")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .gte("work_date", start)
    .lte("work_date", end)
    .order("work_date");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const shift = Array.isArray(row.shifts) ? row.shifts[0] : row.shifts;
    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: "You",
      employeeNumber: "—",
      shiftId: row.shift_id,
      shiftName: shift?.name ?? "Shift",
      shiftStart: shift?.start_time ?? "—",
      shiftEnd: shift?.end_time ?? "—",
      workDate: row.work_date,
      notes: row.notes,
    };
  });
}
