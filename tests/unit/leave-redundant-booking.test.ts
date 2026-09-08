import { describe, expect, it } from "vitest";

import { findOverlappingLeave, type LeaveDateSpan } from "../../apps/web/src/lib/leave/overlap-utils";

describe("Leave redundant booking prevention & overlap detection", () => {
  const existingRequests: LeaveDateSpan[] = [
    {
      id: "req-pending-1",
      startDate: "2026-09-15",
      endDate: "2026-09-18",
      status: "pending",
      leaveTypeName: "Annual Leave",
    },
    {
      id: "req-approved-1",
      startDate: "2026-10-01",
      endDate: "2026-10-03",
      status: "approved",
      leaveTypeName: "Medical Leave",
    },
    {
      id: "req-cancelled-1",
      startDate: "2026-09-22",
      endDate: "2026-09-25",
      status: "cancelled",
      leaveTypeName: "Annual Leave",
    },
    {
      id: "req-revoked-1",
      startDate: "2026-11-05",
      endDate: "2026-11-07",
      status: "revoked",
      leaveTypeName: "Annual Leave",
    },
    {
      id: "req-rejected-1",
      startDate: "2026-12-01",
      endDate: "2026-12-02",
      status: "rejected",
      leaveTypeName: "Emergency Leave",
    },
  ];

  it("blocks dates that overlap with a pending leave request", () => {
    // Exact match
    const exact = findOverlappingLeave("2026-09-15", "2026-09-18", existingRequests);
    expect(exact).not.toBeNull();
    expect(exact?.id).toBe("req-pending-1");
    expect(exact?.status).toBe("pending");

    // Single day inside pending range
    const single = findOverlappingLeave("2026-09-16", "2026-09-16", existingRequests);
    expect(single).not.toBeNull();
    expect(single?.id).toBe("req-pending-1");

    // Partial overlap starting earlier
    const startEarlier = findOverlappingLeave("2026-09-14", "2026-09-16", existingRequests);
    expect(startEarlier).not.toBeNull();
    expect(startEarlier?.id).toBe("req-pending-1");

    // Partial overlap ending later
    const endLater = findOverlappingLeave("2026-09-17", "2026-09-20", existingRequests);
    expect(endLater).not.toBeNull();
    expect(endLater?.id).toBe("req-pending-1");

    // Completely enveloping pending range
    const enveloping = findOverlappingLeave("2026-09-10", "2026-09-20", existingRequests);
    expect(enveloping).not.toBeNull();
    expect(enveloping?.id).toBe("req-pending-1");
  });

  it("blocks dates that overlap with an approved leave request", () => {
    const overlap = findOverlappingLeave("2026-10-02", "2026-10-05", existingRequests);
    expect(overlap).not.toBeNull();
    expect(overlap?.id).toBe("req-approved-1");
    expect(overlap?.status).toBe("approved");
  });

  it("allows re-applying on dates of cancelled, revoked, or rejected requests", () => {
    // Dates matching cancelled request (2026-09-22 -> 2026-09-25) should NOT be blocked
    const onCancelledDates = findOverlappingLeave("2026-09-22", "2026-09-25", existingRequests);
    expect(onCancelledDates).toBeNull();

    // Dates matching revoked request (2026-11-05 -> 2026-11-07) should NOT be blocked
    const onRevokedDates = findOverlappingLeave("2026-11-05", "2026-11-07", existingRequests);
    expect(onRevokedDates).toBeNull();

    // Dates matching rejected request (2026-12-01 -> 2026-12-02) should NOT be blocked
    const onRejectedDates = findOverlappingLeave("2026-12-01", "2026-12-02", existingRequests);
    expect(onRejectedDates).toBeNull();
  });

  it("allows dates completely outside any existing requests", () => {
    const freeDates = findOverlappingLeave("2026-09-01", "2026-09-05", existingRequests);
    expect(freeDates).toBeNull();
  });

  it("respects excludeRequestId parameter", () => {
    // When editing/evaluating an existing request, it should not conflict with itself
    const excluded = findOverlappingLeave(
      "2026-09-15",
      "2026-09-18",
      existingRequests,
      "req-pending-1",
    );
    expect(excluded).toBeNull();
  });
});
