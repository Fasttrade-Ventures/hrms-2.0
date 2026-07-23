import { EmptyState } from "@hrms/ui";

import { formatDateTime } from "@/components/employee/employee-shared";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { listAuditEvents } from "@/lib/hr/audit";
import { requireRole } from "@/lib/auth/session";

export default async function Page() {
  await requireRole("hr_administrator");
  const events = await listAuditEvents().catch(() => []);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="Security and compliance audit trail for your organization."
        title="Audit log"
      />

      <div className="overflow-hidden border border-[var(--border-primary)] bg-[var(--surface-card)]">
        <div className="border-b border-[var(--border-primary)] bg-[var(--surface-muted)] px-4 py-3 text-sm font-medium">
          Recent events ({events.length})
        </div>
        {events.length === 0 ? (
          <div className="p-6">
            <EmptyState description="Audit events will appear as users take actions." title="No events" />
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-primary)]">
            {events.map((event) => (
              <div className="px-5 py-4" key={event.id}>
                <p className="font-medium text-[var(--foreground-primary)]">{event.action}</p>
                <p className="text-sm text-[var(--foreground-secondary)]">
                  {event.resourceType} · {event.resourceId}
                </p>
                <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                  {formatDateTime(event.occurredAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
