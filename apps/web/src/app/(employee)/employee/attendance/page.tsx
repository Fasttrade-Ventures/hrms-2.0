import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { ListCard } from "@hrms/ui";

import { AttendanceClockPanel } from "@/components/employee/attendance-clock-panel";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { isClockInLate, isPastGraceCutoff } from "@/lib/attendance/shift";
import { orgLocalDateString } from "@/lib/datetime/org-timezone";
import { getEmployeeAttendanceContext } from "@/lib/employee/attendance-context";
import { getTodayAttendance, listRecentAttendance } from "@/lib/employee/attendance";

function formatDateLong(dateStr: string): string {
  const [year, month, day] = dateStr.split("T")[0]?.split("-") ?? [];
  if (year && month && day) {
    const d = new Date(`${year}-${month}-${day}T12:00:00`);
    const weekday = d.toLocaleDateString("en-MY", { weekday: "short" });
    return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year} (${weekday})`;
  }
  const d = new Date(dateStr);
  const dayStr = String(d.getDate()).padStart(2, "0");
  const monthStr = String(d.getMonth() + 1).padStart(2, "0");
  const yearNum = d.getFullYear();
  const weekday = d.toLocaleDateString("en-MY", { weekday: "short" });
  return `${dayStr}/${monthStr}/${yearNum} (${weekday})`;
}

function formatTimeOnly(isoString: string | null): string {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleTimeString("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getStatusBadge(
  clockInAt: string | null,
  status?: string | null,
  shift?: { startTime: string; graceMinutes?: number | null } | null,
  isTardy?: boolean,
) {
  if (!clockInAt) {
    if (isTardy) {
      return (
        <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wide inline-flex items-center gap-1">
          Unclocked (Tardy)
        </span>
      );
    }
    return (
      <span className="bg-slate-500/10 text-slate-600 dark:text-slate-400 font-bold px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wide inline-flex items-center gap-1">
        Not Clocked
      </span>
    );
  }

  const isLate = status === "late" || isClockInLate(clockInAt, shift);

  if (isLate) {
    return (
      <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wide inline-flex items-center gap-1">
        Late
      </span>
    );
  }

  return (
    <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wide inline-flex items-center gap-1">
      On Time
    </span>
  );
}

export default async function Page() {
  const today = await getTodayAttendance();
  const [recent, attendanceContext] = await Promise.all([
    listRecentAttendance(),
    getEmployeeAttendanceContext(today?.workDate),
  ]);

  const todayWorkDate = today?.workDate || orgLocalDateString();
  const isTardy =
    !today?.clockInAt &&
    Boolean(attendanceContext.shift) &&
    isPastGraceCutoff({
      workDate: todayWorkDate,
      shift: attendanceContext.shift,
    });

  const headerDescription = attendanceContext.shift
    ? `Clock in and out · Shift ${attendanceContext.shift.name} (${attendanceContext.shift.startTime}–${attendanceContext.shift.endTime}${attendanceContext.shift.graceMinutes > 0 ? ` · Grace ${attendanceContext.shift.graceMinutes}m` : ""})`
    : "Clock in and out for today's shift.";

  return (
    <div className="space-y-8">
      <PortalPageHeader description={headerDescription} title="Attendance" />

      {isTardy && attendanceContext.shift ? (
        <div
          role="alert"
          className="rounded-[var(--radius-xl)] border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Shift Tardiness Alert</p>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                Your shift started at {attendanceContext.shift.startTime}
                {attendanceContext.shift.graceMinutes > 0
                  ? ` (grace period of ${attendanceContext.shift.graceMinutes}m has passed)`
                  : ""}
                . You haven&apos;t clocked in yet. Please clock in immediately or submit a late report.
              </p>
            </div>
          </div>
          <Link
            href="/employee/report-late"
            className="text-xs font-semibold px-3 py-1.5 rounded-[var(--radius-md)] bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-900 transition-colors shrink-0"
          >
            Report Late
          </Link>
        </div>
      ) : null}

      <AttendanceClockPanel
        geofence={attendanceContext.geofence}
        locationModuleEnabled={attendanceContext.locationModuleEnabled}
        today={today}
      />

      <ListCard
        columns={[
          { key: "date", label: "Date" },
          { key: "in", label: "CLOCK IN", className: "hidden sm:block flex-1" },
          { key: "out", label: "CLOCK OUT", className: "hidden sm:block flex-1" },
          { key: "duration", label: "TOTAL TIME", className: "hidden md:block flex-1" },
          { key: "status", label: "STATUS", className: "w-32" },
          { key: "location", label: "LOCATION", className: "hidden lg:block flex-1" },
        ]}
        empty={
          <p className="p-6 text-sm text-[var(--foreground-secondary)]">No attendance history yet.</p>
        }
        header={<p className="text-sm font-medium">Recent attendance</p>}
        rows={recent.map((row) => {
          let durationStr = "—";
          if ("totalDurationSeconds" in row && typeof row.totalDurationSeconds === "number" && row.totalDurationSeconds > 0) {
            const hrs = Math.floor(row.totalDurationSeconds / 3600);
            const mins = Math.floor((row.totalDurationSeconds % 3600) / 60);
            durationStr = `${hrs}h ${mins.toString().padStart(2, "0")}m`;
          }

          const locationNode = (
            <span className="text-xs text-[var(--foreground-secondary)] font-semibold">
              {row.latitude && row.longitude ? (
                `${row.latitude.toFixed(5)}, ${row.longitude.toFixed(5)}`
              ) : (
                "—"
              )}
            </span>
          );

          const clockOutNode = row.clock_out_at ? (
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              <span>{formatTimeOnly(row.clock_out_at)}</span>
              {row.isAutoClockOut && (
                <span
                  title="Auto clocked out at shift end"
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 uppercase tracking-tight shrink-0 select-none"
                >
                  Auto
                </span>
              )}
            </span>
          ) : (
            "—"
          );

          return {
            id: row.work_date,
            cells: {
              date: formatDateLong(row.work_date),
              in: formatTimeOnly(row.clock_in_at),
              out: clockOutNode,
              duration: durationStr,
              status: getStatusBadge(
                row.clock_in_at,
                row.status,
                row.shift,
                row.work_date === todayWorkDate && isTardy,
              ),
              location: locationNode,
            },
          };
        })}
      />
    </div>
  );
}
