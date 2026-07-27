import { notFound } from "next/navigation";

import { AnnouncementDetail } from "@/components/announcements/announcement-detail";
import { markAnnouncementRead } from "@/lib/announcements/reads";
import {
  getAnnouncementViewer,
  getVisibleAnnouncement,
} from "@/lib/announcements/queries";
import { requireModule } from "@/lib/entitlements";
import { requireManagerContext } from "@/lib/manager/context";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  requireModule("announcements");
  const { id } = await params;
  const { organizationId, session, employeeId } = await requireManagerContext();
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

  await markAnnouncementRead({ announcementId: id, userId: session.user.id });

  return <AnnouncementDetail announcement={announcement} backHref="/manager/announcements" />;
}
