import { ListCard } from "@hrms/ui";

import { AttendanceClockPanel } from "@/components/employee/attendance-clock-panel";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { getEmployeeAttendanceContext } from "@/lib/employee/attendance-context";
import { getTodayAttendance, listRecentAttendance } from "@/lib/employee/attendance";

function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDate();
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const year = d.getFullYear();
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
  return `${day} ${month} ${year} (${weekday})`;
}

function formatTimeOnly(isoString: string | null): string {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleTimeString("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getStatusBadge(clockInAt: string | null) {
  if (!clockInAt) {
    return (
      <span className="bg-slate-500/10 text-slate-600 dark:text-slate-400 font-bold px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wide inline-flex items-center gap-1">
        Not Clocked
      </span>
    );
  }

  const date = new Date(clockInAt);
  // Get time in Kuala Lumpur timezone to check if after 09:00 AM
  const timeString = date.toLocaleTimeString("en-US", {
    timeZone: "Asia/Kuala_Lumpur",
    hour12: false,
    hour: "numeric",
    minute: "numeric",
  });
  const parts = timeString.split(":").map(Number);
  const hours = parts[0] ?? 0;
  const minutes = parts[1] ?? 0;
  const isLate = hours > 9 || (hours === 9 && minutes > 0);

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
  const [today, recent, attendanceContext] = await Promise.all([
    getTodayAttendance(),
    listRecentAttendance(),
    getEmployeeAttendanceContext(),
  ]);

  return (
    <div className="space-y-8">
      <PortalPageHeader description="Clock in and out for today's shift." title="Attendance" />

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
              status: getStatusBadge(row.clock_in_at),
              location: locationNode,
            },
          };
        })}
      />
    </div>
  );
}
