export type ApprovalStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "revoked";

export type ApprovalEvent = "submit" | "approve" | "reject" | "cancel" | "revoke";

const TRANSITIONS: Record<ApprovalStatus, Partial<Record<ApprovalEvent, ApprovalStatus>>> = {
  draft: { submit: "pending", cancel: "cancelled" },
  pending: { approve: "approved", reject: "rejected", cancel: "cancelled", revoke: "revoked" },
  approved: { revoke: "revoked" },
  rejected: {},
  cancelled: {},
  revoked: {},
};

export function canTransition(
  from: ApprovalStatus,
  event: ApprovalEvent,
): boolean {
  return TRANSITIONS[from][event] !== undefined;
}

export function transition(
  from: ApprovalStatus,
  event: ApprovalEvent,
): ApprovalStatus {
  const next = TRANSITIONS[from][event];
  if (!next) {
    throw new Error(`Invalid approval transition: ${from} + ${event}`);
  }
  return next;
}

export function isTerminal(status: ApprovalStatus): boolean {
  return status === "approved" || status === "rejected" || status === "cancelled" || status === "revoked";
}
