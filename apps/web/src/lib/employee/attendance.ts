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
  sessions: {
    id: string;
    session: number;
    clockInAt: string | null;
    clockOutAt: string | null;
  }[];
  accumulatedSeconds: number;
};

export async function getTodayAttendance(): Promise<TodayAttendance | null> {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();
  const workDate = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("attendance_records")
    .select("id, work_date, session, clock_in_at, clock_out_at, status")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .eq("work_date", workDate)
    .order("session", { ascending: true });

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return null;

  const sessions = data.map((item) => ({
    id: item.id,
    session: Number(item.session),
    clockInAt: item.clock_in_at,
    clockOutAt: item.clock_out_at,
    status: item.status,
  }));

  const activeSession = sessions.find((s) => s.clockOutAt === null);

  // Calculate accumulated seconds of completed sessions
  let accumulatedSeconds = 0;
  sessions.forEach((s) => {
    if (s.clockInAt && s.clockOutAt) {
      accumulatedSeconds += Math.floor(
        (new Date(s.clockOutAt).getTime() - new Date(s.clockInAt).getTime()) / 1000
      );
    }
  });

  const firstSession = sessions[0];
  if (!firstSession) return null;

  // Determine standard clockInAt and clockOutAt values
  const clockInAt = activeSession ? activeSession.clockInAt : (firstSession.clockInAt ?? null);
  const clockOutAt = activeSession ? null : (sessions[sessions.length - 1]?.clockOutAt ?? null);

  return {
    id: activeSession?.id ?? firstSession.id,
    workDate: data[0]?.work_date ?? workDate,
    clockInAt,
    clockOutAt,
    status: activeSession?.status ?? firstSession.status ?? null,
    sessions,
    accumulatedSeconds,
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

  // If there is currently an active session, they cannot clock in again.
  const hasActiveSession = existing?.sessions.some((s) => s.clockOutAt === null);
  if (hasActiveSession) {
    throw new Error("You are already clocked in. Please clock out first.");
  }

  const nextSessionNum = existing ? existing.sessions.length + 1 : 1;

  const record = {
    organization_id: organizationId,
    employee_id: employeeId,
    work_date: workDate,
    session: nextSessionNum,
    clock_in_at: now,
    status: validation.status,
    latitude: input?.latitude ?? null,
    longitude: input?.longitude ?? null,
    ip_address: input?.ipAddress ?? null,
  };

  const { data, error } = await supabase
    .from("attendance_records")
    .insert(record)
    .select("id, work_date, session, clock_in_at, clock_out_at, status")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to clock in.");

  const updated = await getTodayAttendance();
  if (!updated) throw new Error("Failed to retrieve updated attendance.");
  return updated;
}

export async function clockOut(): Promise<TodayAttendance> {
  const supabase = await createClient();
  const existing = await getTodayAttendance();
  const now = new Date().toISOString();

  const activeSession = existing?.sessions.find((s) => s.clockOutAt === null);
  if (!activeSession) {
    throw new Error("Clock in first before clocking out.");
  }

  const { data, error } = await supabase
    .from("attendance_records")
    .update({ clock_out_at: now })
    .eq("id", activeSession.id)
    .select("id, work_date, session, clock_in_at, clock_out_at, status")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to clock out.");

  const updated = await getTodayAttendance();
  if (!updated) throw new Error("Failed to retrieve updated attendance.");
  return updated;
}

export interface DateGroup {
  work_date: string;
  clock_in_at: string | null;
  clock_out_at: string | null;
  status: string | null;
  totalDurationSeconds: number;
  latitude: number | null;
  longitude: number | null;
  ip_address: string | null;
}

export async function listRecentAttendance(limit = 7) {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  // Fetch recent records (limit 50 to cover plenty of historical sessions per day)
  const { data, error } = await supabase
    .from("attendance_records")
    .select("work_date, clock_in_at, clock_out_at, status, session, latitude, longitude, ip_address")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .order("work_date", { ascending: false })
    .order("session", { ascending: true })
    .limit(50);

  if (error) throw new Error(error.message);
  if (!data) return [];

  const groups: Record<string, DateGroup> = {};

  data.forEach((row) => {
    const dateStr = row.work_date;
    if (!groups[dateStr]) {
      groups[dateStr] = {
        work_date: dateStr,
        clock_in_at: row.clock_in_at,
        clock_out_at: row.clock_out_at,
        status: row.status,
        totalDurationSeconds: 0,
        latitude: row.latitude ? Number(row.latitude) : null,
        longitude: row.longitude ? Number(row.longitude) : null,
        ip_address: row.ip_address ?? null,
      };
    }

    // Earliest check-in time of the day (along with its location details if present)
    if (row.clock_in_at && (!groups[dateStr].clock_in_at || new Date(row.clock_in_at) < new Date(groups[dateStr].clock_in_at!))) {
      groups[dateStr].clock_in_at = row.clock_in_at;
      if (row.latitude && row.longitude) {
        groups[dateStr].latitude = Number(row.latitude);
        groups[dateStr].longitude = Number(row.longitude);
      }
      if (row.ip_address) {
        groups[dateStr].ip_address = row.ip_address;
      }
    }

    // Fallback: Populate location/IP from any session of the day if still empty
    if (row.latitude && row.longitude && !groups[dateStr].latitude) {
      groups[dateStr].latitude = Number(row.latitude);
      groups[dateStr].longitude = Number(row.longitude);
    }
    if (row.ip_address && !groups[dateStr].ip_address) {
      groups[dateStr].ip_address = row.ip_address;
    }
    // Latest check-out time of the day
    if (row.clock_out_at) {
      if (!groups[dateStr].clock_out_at || new Date(row.clock_out_at) > new Date(groups[dateStr].clock_out_at!)) {
        groups[dateStr].clock_out_at = row.clock_out_at;
      }
    }

    // Accumulate total duration of completed sessions of the day
    if (row.clock_in_at && row.clock_out_at) {
      const diffMs = new Date(row.clock_out_at).getTime() - new Date(row.clock_in_at).getTime();
      if (diffMs > 0) {
        groups[dateStr].totalDurationSeconds += Math.floor(diffMs / 1000);
      }
    }
  });

  return Object.values(groups)
    .sort((a, b) => b.work_date.localeCompare(a.work_date))
    .slice(0, limit);
}
