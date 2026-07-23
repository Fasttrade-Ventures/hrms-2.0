export type NotificationRow = {
  id: string;
  template: string;
  payload: Record<string, unknown>;
  status: string;
  createdAt: string;
};

export function formatNotificationMessage(row: NotificationRow): string {
  if (row.template === "approval.pending") return "A team member submitted a request for your approval.";
  if (row.template === "approval.approve") return "Your request was approved.";
  if (row.template === "approval.reject") return "Your request was rejected.";
  if (row.template === "announcement.published") return String(row.payload.title ?? "New announcement");
  return row.template;
}
