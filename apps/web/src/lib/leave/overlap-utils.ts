export type LeaveDateSpan = {
  id?: string;
  startDate: string;
  endDate: string;
  status: string;
  leaveTypeName?: string;
};

/**
 * Pure helper to check whether a date range intersects any active (pending or approved) leave request.
 * Cancelled, rejected, and revoked requests are ignored so employees can re-apply once cancelled.
 * This file is client-safe and has zero server dependencies.
 */
export function findOverlappingLeave(
  targetStart: string,
  targetEnd: string,
  existing: LeaveDateSpan[],
  excludeRequestId?: string,
): LeaveDateSpan | null {
  if (!targetStart || !targetEnd) return null;
  const start = targetStart <= targetEnd ? targetStart : targetEnd;
  const end = targetStart <= targetEnd ? targetEnd : targetStart;

  for (const req of existing) {
    if (excludeRequestId && req.id === excludeRequestId) continue;
    if (req.status !== "pending" && req.status !== "approved") continue;

    if (req.startDate <= end && req.endDate >= start) {
      return req;
    }
  }

  return null;
}
