import { StatCard, StatusPill } from "@hrms/ui";

import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireAuth } from "@/lib/auth/session";

function greetingName(fullName?: string, email?: string): string {
  if (fullName?.trim()) {
    return fullName.trim().split(/\s+/)[0] ?? "there";
  }

  return email?.split("@")[0] ?? "there";
}

export default async function Page() {
  const session = await requireAuth();
  const firstName = greetingName(session.user.fullName, session.user.email);

  return (
    <div className="space-y-8">
      <PortalPageHeader
        description="Your leave, attendance, and requests at a glance."
        title={`Good morning, ${firstName}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard hint="Annual leave remaining" label="Leave balance" value="12 days" />
        <StatCard hint="Clocked in at 8:58 AM" label="Today's attendance" value="Present" />
        <StatCard hint="Awaiting manager review" label="Open requests" value="2" />
        <StatCard hint="Latest company update" label="Announcements" value="3 new" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 border border-[var(--border-primary)] bg-[var(--surface-card)] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--foreground-primary)]">My requests</h2>
            <StatusPill label="2 pending" tone="warning" />
          </div>
          <p className="text-sm text-[var(--foreground-secondary)]">
            Leave and claim requests will appear here once modules are connected.
          </p>
        </section>

        <section className="space-y-4 border border-[var(--border-primary)] bg-[var(--surface-card)] p-5">
          <h2 className="text-base font-semibold text-[var(--foreground-primary)]">Quick actions</h2>
          <div className="flex flex-wrap gap-3">
            <button
              className="bg-[var(--accent-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
              type="button"
            >
              Clock in
            </button>
            <button
              className="border border-[var(--border-primary)] bg-[var(--surface-card)] px-4 py-2.5 text-sm font-medium text-[var(--foreground-primary)] hover:bg-[var(--surface-muted)]"
              type="button"
            >
              Apply leave
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
