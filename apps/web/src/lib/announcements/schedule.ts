export type AnnouncementNotificationState = {
  status: "draft" | "published";
  displayFrom: string | null;
  notificationsSentAt: string | null;
};

export function shouldDeferAnnouncementNotifications(
  publishMode: "draft" | "publish_now" | "schedule",
  displayFrom: string | null,
  today: string,
): boolean {
  return publishMode === "schedule" && Boolean(displayFrom && displayFrom > today);
}

export function shouldSendAnnouncementNotifications(
  announcement: AnnouncementNotificationState,
  asOf: string,
): boolean {
  if (announcement.status !== "published") return false;
  if (announcement.notificationsSentAt) return false;
  if (announcement.displayFrom && announcement.displayFrom > asOf) return false;
  return true;
}
