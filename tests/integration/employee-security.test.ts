import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/employee/leave", () => ({
  requireEmployeeContext: vi.fn(),
  createLeaveRequest: vi.fn(),
}));

vi.mock("@/lib/employee/attendance", () => ({
  clockIn: vi.fn(),
  clockOut: vi.fn(),
}));

vi.mock("@/lib/employee/submit-request", () => ({
  submitEmployeeRequest: vi.fn(),
}));



import { requireEmployeeContext, createLeaveRequest } from "@/lib/employee/leave";
import { createClient } from "@/lib/supabase/server";
import { clockIn, clockOut } from "@/lib/employee/attendance";
import { submitEmployeeRequest } from "@/lib/employee/submit-request";
import {
  applyLeave,
  submitClaim,
  employeeClockIn,
  employeeClockOut,
} from "@/app/(employee)/employee/actions";
import { clearRateLimitStore } from "@/lib/rate-limit";

// Valid UUIDs for Zod schemas validation
const VALID_LEAVE_TYPE_UUID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const VALID_CLAIM_TYPE_UUID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12";

describe("Employee Security - Spam Prevention Rate Limiter", () => {
  const mockEmployeeId = "emp-999";
  const mockOrgId = "org-123";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-21T12:00:00.000Z"));
    clearRateLimitStore();
    vi.clearAllMocks();

    // Default mock setup for requireEmployeeContext
    vi.mocked(requireEmployeeContext).mockResolvedValue({
      session: { user: { id: "user-123" } } as any,
      employeeId: mockEmployeeId,
      organizationId: mockOrgId,
    });

    // Default mock setup for Supabase database query (for claim & leave type verification)
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { name: "Medical Leave", requires_attachment: false },
                error: null,
              }),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: "claim-789", claim_types: { name: "Travel Claim" } },
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    vi.mocked(createLeaveRequest).mockResolvedValue("leave-req-456");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Leave Submission (applyLeave)", () => {
    it("allows the first submission, then blocks rapid resubmission within 3s cooldown", async () => {
      const formData = new FormData();
      formData.append("leaveTypeId", VALID_LEAVE_TYPE_UUID);
      formData.append("startDate", "2026-09-01");
      formData.append("endDate", "2026-09-02");

      // First call (allowed) - should throw redirect (from redirect mock)
      const res = applyLeave({}, formData);
      await expect(res).rejects.toThrow("NEXT_REDIRECT");

      // Second call (blocked) - within cooldown (0ms elapsed)
      const res2 = await applyLeave({}, formData);
      expect(res2.error).toContain("Too many requests. Please try again in 3 seconds.");

      // Advance time by 3 seconds
      vi.advanceTimersByTime(3000);

      // Third call (allowed again after cooldown)
      await expect(applyLeave({}, formData)).rejects.toThrow("NEXT_REDIRECT");
    });

    it("enforces sliding window rate limit of maximum 5 submissions per minute", async () => {
      const formData = new FormData();
      formData.append("leaveTypeId", VALID_LEAVE_TYPE_UUID);
      formData.append("startDate", "2026-09-01");
      formData.append("endDate", "2026-09-02");

      // Make 5 successful submissions (advancing time by 3s cooldown each time)
      for (let i = 0; i < 5; i++) {
        await expect(applyLeave({}, formData)).rejects.toThrow("NEXT_REDIRECT");
        vi.advanceTimersByTime(3000);
      }

      // 6th submission should be blocked by window limit (not cooldown)
      const res = await applyLeave({}, formData);
      console.log("6th applyLeave result:", res);
      expect(res.error).toContain("Too many requests. Please try again");
    });
  });

  describe("Claim Submission (submitClaim)", () => {
    it("allows the first submission, then blocks rapid resubmission within 2s cooldown", async () => {
      const formData = new FormData();
      formData.append("claimTypeId", VALID_CLAIM_TYPE_UUID);
      formData.append("amount", "150.00");
      formData.append("receiptDate", "2026-08-20");

      // First call (allowed)
      const res1 = await submitClaim({}, formData);
      console.log("First claim result:", res1);
      expect(res1.success).toBe("Claim submitted for approval.");

      // Second call (blocked)
      const res2 = await submitClaim({}, formData);
      expect(res2.error).toContain("Too many requests. Please try again in 2 seconds.");

      // Advance time by 2 seconds
      vi.advanceTimersByTime(2000);

      // Third call (allowed again after cooldown)
      const res3 = await submitClaim({}, formData);
      expect(res3.success).toBe("Claim submitted for approval.");
    });
  });

  describe("Clock In / Clock Out", () => {
    it("rate limits employeeClockIn requests with 3s cooldown", async () => {
      const formData = new FormData();
      formData.append("latitude", "3.1390");
      formData.append("longitude", "101.6869");

      // First call (allowed)
      const res1 = await employeeClockIn(formData);
      console.log("First clock-in result:", res1);
      expect(res1.success).toBe("Clocked in successfully.");

      // Second call (blocked)
      const res2 = await employeeClockIn(formData);
      expect(res2.error).toContain("Too many requests. Please try again in 3 seconds.");

      // Advance time by 3 seconds
      vi.advanceTimersByTime(3000);

      // Third call (allowed again)
      const res3 = await employeeClockIn(formData);
      expect(res3.success).toBe("Clocked in successfully.");
    });

    it("rate limits employeeClockOut requests with 3s cooldown", async () => {
      // First call (allowed)
      const res1 = await employeeClockOut();
      console.log("First clock-out result:", res1);
      expect(res1.success).toBe("Clocked out successfully.");

      // Second call (blocked)
      const res2 = await employeeClockOut();
      expect(res2.error).toContain("Too many requests. Please try again in 3 seconds.");

      // Advance time by 3 seconds
      vi.advanceTimersByTime(3000);

      // Third call (allowed again)
      const res3 = await employeeClockOut();
      expect(res3.success).toBe("Clocked out successfully.");
    });
  });
});
