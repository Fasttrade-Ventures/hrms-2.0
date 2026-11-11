import { createClient } from "@/lib/supabase/server";

import { getOrganizationIdForReports, listReportEmployees } from "./context";
import type { ReportFilters } from "./types";

export type MatrixCellKind = "hours" | "late" | "absent" | "leave" | "holiday" | "empty";

export type MatrixCell = {
  kind: MatrixCellKind;
  label: string;
  hours?: number;
  title?: string;
};

export type AttendanceMatrixDay = {
  date: string;
  dayOfMonth: number;
  weekday: string;
  isWeekend: boolean;
  isHoliday: boolean;
};

export type AttendanceMatrixEmployeeRow = {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  branch: string | null;
  department: string | null;
  cells: Record<string, MatrixCell>;
  totalHours: number;
};

export type AttendanceMatrixData = {
  days: AttendanceMatrixDay[];
  rows: AttendanceMatrixEmployeeRow[];
  rangeLabel: string;
};

const WEEKDAY = ["S", "M", "T", "W", "T", "F", "S"];

function hoursBetween(clockIn: string, clockOut: string): number {
  const start = Date.parse(clockIn);
  const end = Date.parse(clockOut);
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  return Math.round(((end - start) / 3_600_000) * 100) / 100;
}

function eachDateInclusive(from: string, to: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export function leaveTypeShortCode(name: string): string {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return "LV";
  if (normalized.includes("annual") || normalized === "al") return "AL";
  if (normalized.includes("medical") || normalized.includes("sick") || normalized === "mc") return "MC";
  if (normalized.includes("emergency")) return "EL";
  if (normalized.includes("unpaid")) return "UL";
  if (normalized.includes("replacement")) return "RL";
  if (normalized.includes("maternity")) return "ML";
  if (normalized.includes("paternity")) return "PL";
  if (normalized.includes("half")) return "HD";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 3).toUpperCase();
  return parts
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

function formatRangeLabel(from: string, to: string): string {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  const sameMonth =
    start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
  if (sameMonth) {
    return start.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  }
  return `${from} → ${to}`;
}

export async function listAttendanceMatrixData(filters: ReportFilters): Promise<AttendanceMatrixData> {
  const supabase = await createClient();
  const organizationId = await getOrganizationIdForReports();
  const employees = await listReportEmployees({ ...filters, page: 1, pageSize: 500 });
  const employeeIds = employees.map((employee) => employee.id);
  const dates = eachDateInclusive(filters.from, filters.to);

  const [
    { data: attendance, error: attendanceError },
    { data: holidays, error: holidayError },
    leaveRes,
    { data: orgCountry },
  ] = await Promise.all([
    employeeIds.length
      ? supabase
          .from("attendance_records")
          .select("employee_id, work_date, clock_in_at, clock_out_at, status")
          .eq("organization_id", organizationId)
          .in("employee_id", employeeIds)
          .gte("work_date", filters.from)
          .lte("work_date", filters.to)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("holidays")
      .select("holiday_date")
      .eq("organization_id", organizationId)
      // Look back 1 day so a Sunday PH just before the range still creates Monday HOL.
      .gte(
        "holiday_date",
        (() => {
          const d = new Date(`${filters.from}T12:00:00`);
          d.setDate(d.getDate() - 1);
          return d.toISOString().slice(0, 10);
        })(),
      )
      .lte("holiday_date", filters.to),
    employeeIds.length
      ? supabase
          .from("leave_requests")
          .select("employee_id, start_date, end_date, half_day, status, leave_types(name)")
          .eq("organization_id", organizationId)
          .eq("status", "approved")
          .in("employee_id", employeeIds)
          .lte("start_date", filters.to)
          .gte("end_date", filters.from)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("organizations").select("country").eq("id", organizationId).maybeSingle(),
  ]);

  if (attendanceError) throw new Error(attendanceError.message);
  if (holidayError) throw new Error(holidayError.message);
  if (leaveRes.error) throw new Error(leaveRes.error.message);

  const { expandMalaysiaReplacementHolidayDates } = await import("@hrms/domain");
  const rawHolidayDates = (holidays ?? []).map((row) => row.holiday_date as string);
  const holidayDates =
    (orgCountry?.country ?? "MY") === "MY"
      ? expandMalaysiaReplacementHolidayDates(rawHolidayDates, "sat_sun")
      : rawHolidayDates;
  const holidaySet = new Set(holidayDates);

  const days: AttendanceMatrixDay[] = dates.map((date) => {
    const utc = new Date(`${date}T00:00:00.000Z`);
    const weekdayIndex = utc.getUTCDay();
    return {
      date,
      dayOfMonth: utc.getUTCDate(),
      weekday: WEEKDAY[weekdayIndex]!,
      isWeekend: weekdayIndex === 0 || weekdayIndex === 6,
      isHoliday: holidaySet.has(date),
    };
  });

  type AttKey = string;
  const attendanceByKey = new Map<
    AttKey,
    { clockIn: string | null; clockOut: string | null; status: string | null; hours: number }
  >();

  for (const row of attendance ?? []) {
    const key = `${row.employee_id}:${row.work_date}`;
    const hours =
      row.clock_in_at && row.clock_out_at ? hoursBetween(row.clock_in_at, row.clock_out_at) : 0;
    const existing = attendanceByKey.get(key);
    if (!existing) {
      attendanceByKey.set(key, {
        clockIn: row.clock_in_at,
        clockOut: row.clock_out_at,
        status: row.status,
        hours,
      });
    } else {
      existing.hours += hours;
      if (!existing.clockIn && row.clock_in_at) existing.clockIn = row.clock_in_at;
      if (!existing.clockOut && row.clock_out_at) existing.clockOut = row.clock_out_at;
      if (row.status === "late") existing.status = "late";
      if (row.status === "absent" && !existing.clockIn) existing.status = "absent";
    }
  }

  const leaveByKey = new Map<AttKey, { code: string; title: string }>();
  for (const row of leaveRes.data ?? []) {
    const leaveType = Array.isArray(row.leave_types) ? row.leave_types[0] : row.leave_types;
    const name = (leaveType as { name?: string } | null)?.name ?? "Leave";
    const code = row.half_day ? "HD" : leaveTypeShortCode(name);
    const span = eachDateInclusive(row.start_date, row.end_date);
    for (const date of span) {
      if (date < filters.from || date > filters.to) continue;
      leaveByKey.set(`${row.employee_id}:${date}`, { code, title: name });
    }
  }

  const rows: AttendanceMatrixEmployeeRow[] = employees.map((employee) => {
    const cells: Record<string, MatrixCell> = {};
    let totalHours = 0;

    for (const day of days) {
      const key = `${employee.id}:${day.date}`;
      const leave = leaveByKey.get(key);
      if (leave) {
        cells[day.date] = {
          kind: "leave",
          label: leave.code,
          title: leave.title,
        };
        continue;
      }

      if (day.isHoliday) {
        cells[day.date] = { kind: "holiday", label: "HOL", title: "Holiday" };
        continue;
      }

      const att = attendanceByKey.get(key);
      if (!att) {
        cells[day.date] = { kind: "empty", label: "" };
        continue;
      }

      if (att.clockIn) {
        totalHours += att.hours;
        const label = att.hours > 0 ? `${att.hours}` : "✓";
        cells[day.date] = {
          kind: att.status === "late" ? "late" : "hours",
          label,
          hours: att.hours,
          title:
            att.status === "late"
              ? `Late${att.hours ? ` · ${att.hours}h` : ""}`
              : att.hours
                ? `${att.hours} hours`
                : "Present",
        };
        continue;
      }

      if (att.status === "absent") {
        cells[day.date] = { kind: "absent", label: "x", title: "Absent" };
        continue;
      }

      cells[day.date] = { kind: "empty", label: "" };
    }

    return {
      employeeId: employee.id,
      employeeNumber: employee.employeeNumber,
      employeeName: employee.fullName,
      branch: employee.branchName,
      department: employee.departmentName,
      cells,
      totalHours: Math.round(totalHours * 100) / 100,
    };
  });

  return {
    days,
    rows,
    rangeLabel: formatRangeLabel(filters.from, filters.to),
  };
}
