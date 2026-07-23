import Link from "next/link";

import { StatCard, StatusPill } from "@hrms/ui";

import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireAuth } from "@/lib/auth/session";

export default async function Page() {
  const session = await requireAuth();

  return (
    <div className="space-y-8">
      <PortalPageHeader
        actions={
          <Link
            className="bg-[var(--accent-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
            href="/hr/employees"
          >
            Create employee
          </Link>
        }
        description={`Signed in as ${session.user.email ?? "HR administrator"}.`}
        title="HR dashboard"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard hint="Active headcount" label="Employees" value="—" />
        <StatCard hint="Awaiting activation" label="Pending invites" value="—" />
        <StatCard hint="Across all branches" label="Open requests" value="—" />
        <StatCard hint="This month" label="Payroll status" value="Not started" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 border border-[var(--border-primary)] bg-[var(--surface-card)] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--foreground-primary)]">People operations</h2>
            <StatusPill label="Phase 3 next" tone="neutral" />
          </div>
          <p className="text-sm text-[var(--foreground-secondary)]">
            Employee creation, profiles, and activation emails will be wired in the next phase.
          </p>
        </section>

        <section className="space-y-4 border border-[var(--border-primary)] bg-[var(--surface-card)] p-5">
          <h2 className="text-base font-semibold text-[var(--foreground-primary)]">Shortcuts</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              className="border border-[var(--border-primary)] bg-[var(--surface-card)] px-4 py-2.5 text-sm font-medium text-[var(--foreground-primary)] hover:bg-[var(--surface-muted)]"
              href="/hr/employees"
            >
              View employees
            </Link>
            <Link
              className="border border-[var(--border-primary)] bg-[var(--surface-card)] px-4 py-2.5 text-sm font-medium text-[var(--foreground-primary)] hover:bg-[var(--surface-muted)]"
              href="/hr/audit"
            >
              Audit log
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
