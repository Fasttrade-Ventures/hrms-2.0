import { EmptyState } from "@hrms/ui";

import { formatDateTime } from "@/components/employee/employee-shared";
import { PublishAnnouncementForm } from "@/components/hr/publish-announcement-form";
import { PortalSectionCard } from "@/components/portal/portal-section";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { listAnnouncements } from "@/lib/hr/announcements";
import { requireRole } from "@/lib/auth/session";

export default async function Page() {
  await requireRole("hr_administrator");
  const announcements = await listAnnouncements().catch(() => []);

  return (
    <div className="space-y-8">
      <PortalPageHeader
        description="Publish company-wide announcements visible to employees."
        title="Announcements"
      />

      <PortalSectionCard description="Visible to all employees in the organization." title="Publish announcement">
        <PublishAnnouncementForm />
      </PortalSectionCard>

      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-primary)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]">
        <div className="border-b border-[var(--border-primary)] bg-[var(--surface-muted)] px-4 py-3 text-sm font-medium">
          Published ({announcements.length})
        </div>
        {announcements.length === 0 ? (
          <div className="p-6">
            <EmptyState description="Published announcements will appear here." title="No announcements" />
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-primary)]">
            {announcements.map((item) => (
              <article className="px-5 py-4" key={item.id}>
                <h2 className="font-medium text-[var(--foreground-primary)]">{item.title}</h2>
                <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                  {formatDateTime(item.postedAt)}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--foreground-secondary)]">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
