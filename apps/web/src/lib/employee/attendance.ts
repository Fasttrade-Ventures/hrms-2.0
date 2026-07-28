import { requireEmployeeContext } from "@/lib/employee/leave";
import { getEmployeeAttendanceContext } from "@/lib/employee/attendance-context";
import { validateGeofenceClockIn } from "@/lib/attendance/geofence";
import { createClient } from "@/lib/supabase/server";

export type TodayAttendance = {
  id: string;
  workDate: string;
  clockInAt: string | null;
  clockOutAt: string | null;
  status: string | null;
};

export async function getTodayAttendance(): Promise<TodayAttendance | null> {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();
  const workDate = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("attendance_records")
    .select("id, work_date, clock_in_at, clock_out_at, status")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .eq("work_date", workDate)
    .eq("session", 1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id,
    workDate: data.work_date,
    clockInAt: data.clock_in_at,
    clockOutAt: data.clock_out_at,
    status: data.status,
  };
}

export async function clockIn(input?: {
  latitude?: number | null;
  longitude?: number | null;
  ipAddress?: string | null;
}): Promise<TodayAttendance> {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const { geofence } = await getEmployeeAttendanceContext();
  const validation = validateGeofenceClockIn({
    geofence,
    latitude: input?.latitude,
    longitude: input?.longitude,
  });

  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const supabase = await createClient();
  const workDate = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();
  const existing = await getTodayAttendance();

  if (existing?.clockInAt) {
    throw new Error("You are already clocked in for today.");
  }

  const record = {
    clock_in_at: now,
    status: validation.status,
    latitude: input?.latitude ?? null,
    longitude: input?.longitude ?? null,
    ip_address: input?.ipAddress ?? null,
  };

  if (existing) {
    const { data, error } = await supabase
      .from("attendance_records")
      .update(record)
      .eq("id", existing.id)
      .select("id, work_date, clock_in_at, clock_out_at, status")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Failed to clock in.");
    return {
      id: data.id,
      workDate: data.work_date,
      clockInAt: data.clock_in_at,
      clockOutAt: data.clock_out_at,
      status: data.status,
    };
  }

  const { data, error } = await supabase
    .from("attendance_records")
    .insert({
      organization_id: organizationId,
      employee_id: employeeId,
      work_date: workDate,
      session: 1,
      ...record,
    })
    .select("id, work_date, clock_in_at, clock_out_at, status")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to clock in.");

  return {
    id: data.id,
    workDate: data.work_date,
    clockInAt: data.clock_in_at,
    clockOutAt: data.clock_out_at,
    status: data.status,
  };
}

export async function clockOut(): Promise<TodayAttendance> {
  const supabase = await createClient();
  const existing = await getTodayAttendance();
  const now = new Date().toISOString();

  if (!existing?.clockInAt) {
    throw new Error("Clock in first before clocking out.");
  }

  if (existing.clockOutAt) {
    throw new Error("You have already clocked out for today.");
  }

  const { data, error } = await supabase
    .from("attendance_records")
    .update({ clock_out_at: now })
    .eq("id", existing.id)
    .select("id, work_date, clock_in_at, clock_out_at, status")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to clock out.");

  return {
    id: data.id,
    workDate: data.work_date,
    clockInAt: data.clock_in_at,
    clockOutAt: data.clock_out_at,
    status: data.status,
  };
}

export async function listRecentAttendance(limit = 7) {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("attendance_records")
    .select("work_date, clock_in_at, clock_out_at, status")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .order("work_date", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}
