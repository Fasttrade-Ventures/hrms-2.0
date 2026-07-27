import { notFound } from "next/navigation";

import { AnnouncementDetail } from "@/components/announcements/announcement-detail";
import { markAnnouncementReadAction } from "@/lib/announcements/actions";
import {
  getAnnouncementViewer,
  getVisibleAnnouncement,
} from "@/lib/announcements/queries";
import { requireEmployeeContext } from "@/lib/employee/leave";
import { requireModule } from "@/lib/entitlements";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  requireModule("announcements");
  const { id } = await params;
  const { organizationId, session, employeeId } = await requireEmployeeContext();
  const viewer = await getAnnouncementViewer({
    organizationId,
    employeeId,
    roles: session.membership.roles,
  });
  const announcement = await getVisibleAnnouncement({
    organizationId,
    announcementId: id,
    viewer,
  });

  if (!announcement) notFound();

  await markAnnouncementReadAction(id);

  return <AnnouncementDetail announcement={announcement} backHref="/employee/announcements" />;
}
