export type OfferStatus = "draft" | "sent" | "accepted" | "declined" | "withdrawn";

export function canTransitionOfferStatus(from: OfferStatus, to: OfferStatus): boolean {
  if (from === to) return false;
  if (from === "accepted" || from === "declined" || from === "withdrawn") return false;
  if (to === "sent") return from === "draft";
  if (to === "declined" || to === "withdrawn") return from === "draft" || from === "sent";
  return false;
}
