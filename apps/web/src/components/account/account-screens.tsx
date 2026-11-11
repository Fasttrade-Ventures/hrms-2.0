import Link from "next/link";

import {
  EmployeeInfoCard,
  EmployeeProfileHeader,
} from "@/components/employee/employee-profile";
import { NotificationsList } from "@/components/notifications/notifications-list";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireAuth } from "@/lib/auth/session";
import { getCurrentEmployeeDetail } from "@/lib/employees/self";
import { getNotificationTabCounts, listUserNotifications } from "@/lib/notifications/inbox";
import type { NotificationPortal } from "@/lib/notifications/placeholders";

export async function AccountProfileScreen({ securityHref }: { securityHref: string }) {
  const session = await requireAuth();
  const employee = await getCurrentEmployeeDetail();

  if (!employee) {
    return (
      <div className="space-y-6">
        <PortalPageHeader
          description={session.user.email ?? "Signed in"}
          title={session.user.fullName ?? "Profile"}
        />
        <section className="space-y-3 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6">
          <p className="text-sm text-[var(--foreground-secondary)]">
            No employee record is linked to this login. Password changes stay available.
          </p>
          <Link
            className="inline-flex h-11 items-center bg-[var(--accent-primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
            href={securityHref}
          >
            Password and security
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EmployeeProfileHeader
        branchName={employee.branchName}
        departmentName={employee.departmentName}
        email={employee.email}
        employeeNumber={employee.employeeNumber}
        fullName={employee.fullName}
      />
      <div className="grid gap-6 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6 md:grid-cols-2">
        <EmployeeInfoCard label="Work email" value={employee.email} />
        <EmployeeInfoCard label="Phone" value={employee.profile.phone} />
        <EmployeeInfoCard label="Job title" value={employee.jobTitle} />
        <EmployeeInfoCard label="Join date" value={employee.joinDate} />
        <EmployeeInfoCard label="Branch" value={employee.branchName} />
        <EmployeeInfoCard label="Department" value={employee.departmentName} />
      </div>
      <Link
        className="inline-flex h-11 items-center bg-[var(--accent-primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
        href={securityHref}
      >
        Password and security
      </Link>
    </div>
  );
}

export async function AccountSecurityScreen() {
  const session = await requireAuth();
  const roles = session.membership.roles.join(", ");

  return (
    <div className="space-y-6">
      <PortalPageHeader description={session.user.email ?? "Signed in"} title="Security" />
      <section className="space-y-4 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6">
        <h2 className="text-base font-semibold text-[var(--foreground-primary)]">Password</h2>
        <p className="text-sm text-[var(--foreground-secondary)]">
          Change your password regularly. You will need your current password to confirm the update.
        </p>
        <Link
          className="inline-flex h-11 items-center bg-[var(--accent-primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
          href="/auth/change-password"
        >
          Change password
        </Link>
      </section>
      <section className="space-y-2 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6">
        <h2 className="text-base font-semibold text-[var(--foreground-primary)]">Account</h2>
        <p className="text-sm text-[var(--foreground-secondary)]">
          Signed in as {session.user.email ?? "this account"}
        </p>
        {roles ? <p className="text-sm text-[var(--foreground-secondary)]">Roles: {roles}</p> : null}
      </section>
    </div>
  );
}

export async function AccountNotificationsScreen({
  notificationPortal,
  searchParams,
}: {
  notificationPortal: NotificationPortal;
  searchParams: Promise<{ page?: string; tab?: string; filter?: string }>;
}) {
  await requireAuth();
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const tab = params.tab ?? "all";
  const filter = params.filter ?? "all";
  const unreadOnly = filter === "unread";
  const [notificationsResult, counts] = await Promise.all([
    listUserNotifications(tab, page, 10, unreadOnly),
    getNotificationTabCounts(true),
  ]);

  return (
    <div className="space-y-6">
      <NotificationsList
        activeTab={tab}
        filter={filter}
        notifications={notificationsResult.notifications}
        page={page}
        pageSize={10}
        portal={notificationPortal}
        tabCounts={counts}
        total={notificationsResult.total}
      />
    </div>
  );
}
