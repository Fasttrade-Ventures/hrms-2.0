import Link from "next/link";

import { StatCard, StatusPill } from "@hrms/ui";

import { PortalPageHeader } from "@/components/portal/portal-primitives";
import {
  firstNameFromFullName,
  getCurrentEmployeeDetail,
  greetingForHour,
} from "@/lib/employees/self";

export default async function Page() {
  const employee = await getCurrentEmployeeDetail();
  const hour = new Date().getHours();
  const greeting = greetingForHour(hour);
  const firstName = firstNameFromFullName(employee?.fullName, employee?.email);

  return (
    <div className="space-y-8">
      <PortalPageHeader
        description={
          employee
            ? `${employee.employeeNumber}${employee.departmentName ? ` · ${employee.departmentName}` : ""}`
            : "Your leave, attendance, and requests at a glance."
        }
        title={`${greeting}, ${firstName}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard hint="Annual leave remaining" label="Leave balance" value="12 days" />
        <StatCard hint="Not clocked in yet today" label="Today's attendance" value="—" />
        <StatCard hint="Awaiting manager review" label="Open requests" value="0" />
        <StatCard hint="Company updates" label="Announcements" value="—" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 border border-[var(--border-primary)] bg-[var(--surface-card)] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--foreground-primary)]">My requests</h2>
            <StatusPill label="No pending" tone="neutral" />
          </div>
          <p className="text-sm text-[var(--foreground-secondary)]">
            Leave and claim requests will appear here once you apply.
          </p>
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
              className="border border-[var(--border-primary)] bg-[var(--surface-card)] px-4 py-2.5 text-sm font-medium text-[var(--foreground-primary)] hover:bg-[var(--surface-muted)]"
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
