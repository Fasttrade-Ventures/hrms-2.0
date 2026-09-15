import { describe, expect, it } from "vitest";

import { mapApprovalInboxRow, summarizeApprovalPayload } from "../../apps/web/src/lib/approvals/inbox";

describe("Manager Approvals Inbox - Status & Expired Mapping", () => {
  const today = new Date().toISOString().slice(0, 10);

  it("detects expired status when step comment mentions expired", () => {
    const row = {
      id: "step-1",
      status: "cancelled",
      comment: "Expired: leave dates passed without approval",
      approval_requests: {
        id: "req-1",
        request_type: "leave",
        status: "cancelled",
        submitted_at: "2026-08-01T00:00:00Z",
        payload: {
          leaveTypeName: "Annual Leave",
          startDate: "2026-08-01",
          endDate: "2026-08-05",
        },
        employees: {
          full_name: "Ahmad Albab",
          employee_number: "EMP-001",
          email: "ahmad@example.com",
        },
      },
    };

    const mapped = mapApprovalInboxRow(row);
    expect(mapped.status).toBe("expired");
    expect(mapped.requesterName).toBe("Ahmad Albab");
    expect(mapped.summary).toBe("Annual Leave · 2026-08-01 → 2026-08-05");
  });

  it("detects expired status when payload cancellationReason mentions expired", () => {
    const row = {
      id: "step-2",
      status: "cancelled",
      comment: null,
      approval_requests: {
        id: "req-2",
        request_type: "leave",
        status: "cancelled",
        submitted_at: "2026-08-01T00:00:00Z",
        payload: {
          leaveTypeName: "Medical Leave",
          startDate: "2026-08-10",
          endDate: "2026-08-11",
          cancellationReason: "Expired: leave dates passed without manager approval",
        },
        employees: {
          full_name: "Siti Nurhaliza",
          employee_number: "EMP-002",
        },
      },
    };

    const mapped = mapApprovalInboxRow(row);
    expect(mapped.status).toBe("expired");
    expect(mapped.requesterName).toBe("Siti Nurhaliza");
  });

  it("detects expired status when leave end_date is in the past even if step was pending", () => {
    const row = {
      id: "step-3",
      status: "pending",
      comment: null,
      approval_requests: {
        id: "req-3",
        request_type: "leave",
        status: "pending",
        submitted_at: "2026-08-01T00:00:00Z",
        payload: {
          leaveTypeName: "Annual Leave",
          startDate: "2026-08-10",
          endDate: "2026-08-12", // Definitely in the past relative to 2026-09-08
        },
        employees: {
          full_name: "Ali Baba",
          employee_number: "EMP-003",
        },
      },
    };

    const mapped = mapApprovalInboxRow(row);
    expect(mapped.status).toBe("expired");
  });

  it("keeps pending status when leave end_date is in the future", () => {
    const futureDate = "2026-12-31";
    const row = {
      id: "step-4",
      status: "pending",
      comment: null,
      approval_requests: {
        id: "req-4",
        request_type: "leave",
        status: "pending",
        submitted_at: "2026-09-01T00:00:00Z",
        payload: {
          leaveTypeName: "Annual Leave",
          startDate: "2026-12-25",
          endDate: futureDate,
        },
        employees: {
          full_name: "Chong Wei",
          employee_number: "EMP-004",
        },
      },
    };

    const mapped = mapApprovalInboxRow(row);
    expect(mapped.status).toBe("pending");
  });

  it("preserves approved and rejected statuses", () => {
    const approvedRow = {
      id: "step-5",
      status: "approved",
      approval_requests: {
        id: "req-5",
        request_type: "claim",
        status: "approved",
        payload: { claimTypeName: "Travel", amount: "150" },
        employees: { full_name: "Muthu", employee_number: "EMP-005" },
      },
    };

    const rejectedRow = {
      id: "step-6",
      status: "rejected",
      approval_requests: {
        id: "req-6",
        request_type: "overtime",
        status: "rejected",
        payload: { workDate: "2026-09-01", hours: "3", rateType: "1.5" },
        employees: { full_name: "Muthu", employee_number: "EMP-005" },
      },
    };

    expect(mapApprovalInboxRow(approvedRow).status).toBe("approved");
    expect(mapApprovalInboxRow(rejectedRow).status).toBe("rejected");
  });

  it("summarizes different request types correctly", () => {
    expect(
      summarizeApprovalPayload("leave", {
        leaveTypeName: "Emergency Leave",
        startDate: "2026-09-01",
        endDate: "2026-09-02",
      }),
    ).toBe("Emergency Leave · 2026-09-01 → 2026-09-02");

    expect(
      summarizeApprovalPayload("claim", {
        claimTypeName: "Dental",
        amount: "200.00",
      }),
    ).toBe("Dental · RM 200.00");

    expect(
      summarizeApprovalPayload("overtime", {
        workDate: "2026-09-05",
        hours: "4",
        rateType: "2.0",
      }),
    ).toBe("2026-09-05 · 4h @ 2.0x");
  });
});
