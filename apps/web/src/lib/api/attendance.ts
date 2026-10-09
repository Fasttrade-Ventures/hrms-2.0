import { createAdminClient } from "@/lib/supabase/admin";
import { isClockInLate, resolveEmployeeShift } from "@/lib/attendance/shift";
import { DEFAULT_ORG_TIMEZONE, orgLocalDateString } from "@/lib/datetime/org-timezone";

export type AttendanceTarget = {
  employeeNumber?: string;
  email?: string;
};

export function parseAttendanceTarget(body: AttendanceTarget): { employeeNumber?: string; email?: string } {
  const employeeNumber = body.employeeNumber?.trim();
  const email = body.email?.trim().toLowerCase();
  if (!employeeNumber && !email) {
    throw new Error("employeeNumber or email is required.");
  }
  return { employeeNumber: employeeNumber || undefined, email: email || undefined };
}

type EmployeeRow = {
  id: string;
  employee_number: string;
  full_name: string;
  email: string | null;
};

async function findEmployee(organizationId: string, target: AttendanceTarget): Promise<EmployeeRow> {
  const parsed = parseAttendanceTarget(target);
  const admin = createAdminClient();
  let query = admin
    .from("employees")
    .select("id, employee_number, full_name, email, status")
    .eq("organization_id", organizationId)
    .eq("status", "active");
  query = parsed.employeeNumber
    ? query.eq("employee_number", parsed.employeeNumber)
    : query.eq("email", parsed.email!);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Active employee not found.");
  return data;
}

async function openSession(organizationId: string, employeeId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("attendance_records")
    .select("id, work_date, session, clock_in_at, clock_out_at")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .is("clock_out_at", null)
    .order("work_date", { ascending: false })
    .order("session", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function clockInFromApi(organizationId: string, target: AttendanceTarget) {
  const employee = await findEmployee(organizationId, target);
  const existing = await openSession(organizationId, employee.id);
  if (existing) {
    throw new Error("Already clocked in.");
  }

  const admin = createAdminClient();
  const workDate = orgLocalDateString();
  const now = new Date().toISOString();
  const { count } = await admin
    .from("attendance_records")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("employee_id", employee.id)
    .eq("work_date", workDate);
  const session = (count ?? 0) + 1;

  let status = "present";
  try {
    const shift = await resolveEmployeeShift(admin, organizationId, employee.id, workDate);
    if (session === 1 && isClockInLate(now, shift, DEFAULT_ORG_TIMEZONE, workDate)) {
      status = "late";
    }
  } catch {
    status = "present";
  }

  const { data, error } = await admin
    .from("attendance_records")
    .insert({
      organization_id: organizationId,
      employee_id: employee.id,
      work_date: workDate,
      session,
      clock_in_at: now,
      status,
      source: "virtual_office",
    })
    .select("id, work_date, session, clock_in_at, status, source")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to clock in.");

  return {
    id: data.id,
    employeeId: employee.id,
    employeeNumber: employee.employee_number,
    fullName: employee.full_name,
    workDate: data.work_date,
    session: data.session,
    clockInAt: data.clock_in_at,
    status: data.status,
    source: data.source,
  };
}

export async function clockOutFromApi(organizationId: string, target: AttendanceTarget) {
  const employee = await findEmployee(organizationId, target);
  const existing = await openSession(organizationId, employee.id);
  if (!existing) {
    throw new Error("Not clocked in.");
  }

  const now = new Date().toISOString();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("attendance_records")
    .update({ clock_out_at: now })
    .eq("id", existing.id)
    .eq("organization_id", organizationId)
    .select("id, work_date, session, clock_in_at, clock_out_at, status, source")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to clock out.");

  return {
    id: data.id,
    employeeId: employee.id,
    employeeNumber: employee.employee_number,
    fullName: employee.full_name,
    workDate: data.work_date,
    session: data.session,
    clockInAt: data.clock_in_at,
    clockOutAt: data.clock_out_at,
    status: data.status,
    source: data.source,
  };
}

export async function listAttendanceFromApi(organizationId: string, date?: string) {
  const workDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : orgLocalDateString();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("attendance_records")
    .select("id, work_date, session, clock_in_at, clock_out_at, status, source, employees(employee_number, full_name, email)")
    .eq("organization_id", organizationId)
    .eq("work_date", workDate)
    .order("clock_in_at", { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
    return {
      id: row.id,
      employeeNumber: employee?.employee_number ?? null,
      fullName: employee?.full_name ?? null,
      email: employee?.email ?? null,
      workDate: row.work_date,
      session: row.session,
      clockInAt: row.clock_in_at,
      clockOutAt: row.clock_out_at,
      status: row.status,
      source: row.source,
    };
  });
}
