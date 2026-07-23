import Link from "next/link";

import { StatCard, StatusPill } from "@hrms/ui";

import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { formatDateTime } from "@/components/employee/employee-shared";
import { getTodayAttendance } from "@/lib/employee/attendance";
import { listAnnouncements } from "@/lib/employee/catalog";
import {
  firstNameFromFullName,
  getCurrentEmployeeDetail,
  greetingForHour,
} from "@/lib/employees/self";
import { getLeaveBalances, listLeaveRequests } from "@/lib/employee/leave";

export default async function Page() {
  const hour = new Date().getHours();
  const employee = await getCurrentEmployeeDetail();
  const firstName = firstNameFromFullName(employee?.fullName, employee?.email);

  const [balances, requests, todayAttendance, announcements] = await Promise.all([
    getLeaveBalances().catch(() => []),
    listLeaveRequests().catch(() => []),
    getTodayAttendance().catch(() => null),
    listAnnouncements().catch(() => []),
  ]);

  const annual = balances.find((row) => row.leaveTypeName === "Annual Leave");
  const pendingRequests = requests.filter((row) => row.status === "pending").length;
  const attendanceLabel = todayAttendance?.clockInAt
    ? todayAttendance.clockOutAt
      ? "Completed"
      : "Clocked in"
    : "Not clocked in";

  return (
    <div className="space-y-8">
      <PortalPageHeader
        description={
          employee
            ? `${employee.employeeNumber}${employee.departmentName ? ` · ${employee.departmentName}` : ""}`
            : "Your leave, attendance, and requests at a glance."
        }
        title={`${greetingForHour(hour)}, ${firstName}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          hint={`${annual?.usedDays ?? 0} used · ${annual?.pendingDays ?? 0} pending`}
          label="Leave balance"
          value={annual ? `${annual.remainingDays} days` : "—"}
        />
        <StatCard
          hint={todayAttendance?.clockInAt ? formatDateTime(todayAttendance.clockInAt) : "Tap attendance to clock in"}
          label="Today's attendance"
          value={attendanceLabel}
        />
        <StatCard hint="Awaiting manager review" label="Open requests" value={String(pendingRequests)} />
        <StatCard hint="Latest company updates" label="Announcements" value={String(announcements.length)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 border border-[var(--border-primary)] bg-[var(--surface-card)] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--foreground-primary)]">My requests</h2>
            <StatusPill
              label={pendingRequests > 0 ? `${pendingRequests} pending` : "Up to date"}
              tone={pendingRequests > 0 ? "warning" : "neutral"}
            />
          </div>
          <p className="text-sm text-[var(--foreground-secondary)]">
            {requests.length
              ? `You have ${requests.length} leave request(s) on record.`
              : "No leave requests yet."}
          </p>
          <Link className="text-sm font-medium text-[var(--accent-primary)]" href="/employee/leave">
            View leave
          </Link>
        </section>

        <section className="space-y-4 border border-[var(--border-primary)] bg-[var(--surface-card)] p-5">
          <h2 className="text-base font-semibold text-[var(--foreground-primary)]">Quick actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              className="bg-[var(--accent-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
              href="/employee/attendance"
            >
              Clock in
            </Link>
            <Link
              className="border border-[var(--border-primary)] bg-[var(--surface-card)] px-4 py-2.5 text-sm font-medium hover:bg-[var(--surface-muted)]"
              href="/employee/leave"
            >
              Apply leave
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
