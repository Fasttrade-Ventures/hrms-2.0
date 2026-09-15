import { ListCard } from "@hrms/ui";

import { AttendanceClockPanel } from "@/components/employee/attendance-clock-panel";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { isClockInLate } from "@/lib/attendance/shift";
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
) {
  if (!clockInAt) {
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

  const headerDescription = attendanceContext.shift
    ? `Clock in and out · Shift ${attendanceContext.shift.name} (${attendanceContext.shift.startTime}–${attendanceContext.shift.endTime}${attendanceContext.shift.graceMinutes > 0 ? ` · Grace ${attendanceContext.shift.graceMinutes}m` : ""})`
    : "Clock in and out for today's shift.";

  return (
    <div className="space-y-8">
      <PortalPageHeader description={headerDescription} title="Attendance" />

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

          return {
            id: row.work_date,
            cells: {
              date: formatDateLong(row.work_date),
              in: formatTimeOnly(row.clock_in_at),
              out: formatTimeOnly(row.clock_out_at),
              duration: durationStr,
              status: getStatusBadge(row.clock_in_at, row.status, row.shift),
              location: locationNode,
            },
          };
        })}
      />
    </div>
  );
}
