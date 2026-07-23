import { requireManagerContext } from "@/lib/manager/context";
import { createClient } from "@/lib/supabase/server";

export type TeamMemberRow = {
  id: string;
  employeeNumber: string;
  fullName: string;
  email: string;
  departmentName: string | null;
};

export type TeamLeaveRow = {
  id: string;
  employeeName: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
};

export type TeamAttendanceRow = {
  id: string;
  employeeName: string;
  workDate: string;
  clockInAt: string | null;
  clockOutAt: string | null;
  status: string | null;
};

async function listDirectReports(): Promise<TeamMemberRow[]> {
  const { employeeId, organizationId } = await requireManagerContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("employees")
    .select("id, employee_number, full_name, email, departments(name)")
    .eq("organization_id", organizationId)
    .eq("manager_employee_id", employeeId)
    .eq("status", "active")
    .order("employee_number");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    employeeNumber: row.employee_number,
    fullName: row.full_name ?? row.email,
    email: row.email,
    departmentName: (row.departments as { name?: string } | null)?.name ?? null,
  }));
}

export async function listTeamMembers(): Promise<TeamMemberRow[]> {
  return listDirectReports();
}

export async function listTeamLeave(): Promise<TeamLeaveRow[]> {
  const reports = await listDirectReports();
  if (!reports.length) return [];

  const { organizationId } = await requireManagerContext();
  const supabase = await createClient();
  const reportIds = reports.map((r) => r.id);
  const nameById = new Map(reports.map((r) => [r.id, r.fullName]));

  const { data, error } = await supabase
    .from("leave_requests")
    .select("id, employee_id, start_date, end_date, days, status, leave_types(name)")
    .eq("organization_id", organizationId)
    .in("employee_id", reportIds)
    .order("start_date", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    employeeName: nameById.get(row.employee_id) ?? "Employee",
    leaveTypeName: (row.leave_types as { name?: string } | null)?.name ?? "Leave",
    startDate: row.start_date,
    endDate: row.end_date,
    days: Number(row.days),
    status: row.status,
  }));
}

export async function listTeamAttendance(): Promise<TeamAttendanceRow[]> {
  const reports = await listDirectReports();
  if (!reports.length) return [];

  const { organizationId } = await requireManagerContext();
  const supabase = await createClient();
  const reportIds = reports.map((r) => r.id);
  const nameById = new Map(reports.map((r) => [r.id, r.fullName]));

  const { data, error } = await supabase
    .from("attendance_records")
    .select("id, employee_id, work_date, clock_in_at, clock_out_at, status")
    .eq("organization_id", organizationId)
    .in("employee_id", reportIds)
    .order("work_date", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    employeeName: nameById.get(row.employee_id) ?? "Employee",
    workDate: row.work_date,
    clockInAt: row.clock_in_at,
    clockOutAt: row.clock_out_at,
    status: row.status,
  }));
}

export async function countDirectReports(): Promise<number> {
  const reports = await listDirectReports().catch(() => []);
  return reports.length;
}
