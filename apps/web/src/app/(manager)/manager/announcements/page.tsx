import { EmptyState } from "@hrms/ui";

import { AnnouncementList } from "@/components/announcements/announcement-list";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import {
  getAnnouncementViewer,
  listVisibleAnnouncements,
  toAnnouncementListItem,
} from "@/lib/announcements/queries";
import { getReadAnnouncementIds } from "@/lib/announcements/reads";
import { requireModule } from "@/lib/entitlements";
import { requireManagerContext } from "@/lib/manager/context";

export default async function Page() {
  requireModule("announcements");
  const { organizationId, session, employeeId } = await requireManagerContext();
  const viewer = await getAnnouncementViewer({
    organizationId,
    employeeId,
    roles: session.membership.roles,
  });
  const announcements = await listVisibleAnnouncements({ organizationId, viewer });
  const readIds = await getReadAnnouncementIds(session.user.id);
  const items = announcements.map((announcement) =>
    toAnnouncementListItem(announcement, { isRead: readIds.has(announcement.id) }),
  );

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="Company announcements targeted to managers."
        title="Announcements"
      />
      <p className="text-sm text-muted-foreground">
        All announcements stay here after you read them. Open one to mark it as read.
      </p>

      {items.length === 0 ? (
        <EmptyState description="Announcements for managers will appear here." title="No announcements" />
      ) : (
        <AnnouncementList basePath="/manager/announcements" items={items} />
      )}
    </div>
  );
}
