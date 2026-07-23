import { EmptyState } from "@hrms/ui";

import { formatDateTime } from "@/components/employee/employee-shared";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { listAnnouncements } from "@/lib/employee/catalog";

export default async function Page() {
  const announcements = await listAnnouncements();

  return (
    <div className="space-y-6">
      <PortalPageHeader description="Company announcements and updates." title="Announcements" />

      {announcements.length === 0 ? (
        <EmptyState description="Announcements from HR will appear here." title="No announcements" />
      ) : (
        <div className="space-y-4">
          {announcements.map((item) => (
            <article
              className="border border-[var(--border-primary)] bg-[var(--surface-card)] p-5"
              key={item.id}
            >
              <h2 className="text-base font-semibold text-[var(--foreground-primary)]">{item.title}</h2>
              <p className="mt-1 text-xs text-[var(--foreground-muted)]">{formatDateTime(item.posted_at)}</p>
              <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--foreground-secondary)]">{item.body}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
