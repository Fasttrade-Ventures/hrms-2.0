export type RequisitionStatus = "open" | "on_hold" | "closed";

const ALLOWED: Record<RequisitionStatus, RequisitionStatus[]> = {
  open: ["on_hold", "closed"],
  on_hold: ["open", "closed"],
  closed: ["open"],
};

export function canTransitionRequisitionStatus(from: RequisitionStatus, to: RequisitionStatus): boolean {
  if (from === to) return false;
  return ALLOWED[from].includes(to);
}
