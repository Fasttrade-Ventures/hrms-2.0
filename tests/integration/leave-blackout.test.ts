import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock createClient from server before importing the function under test
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { assertLeaveDatesAllowed } from "@/lib/leave/blackout";

let mockBlackoutsResponse: any[] = [];
let mockBlackoutsError: any = null;

class MockSupabaseQueryBuilder {
  tableName: string;
  calledSelect: string | null = null;
  calledEqs: Array<[string, any]> = [];

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(fields: string) {
    this.calledSelect = fields;
    return this;
  }

  eq(column: string, value: any) {
    this.calledEqs.push([column, value]);
    return Promise.resolve({ data: mockBlackoutsResponse, error: mockBlackoutsError });
  }
}

describe("Leave Blackout Periods Validation", () => {
  const mockOrgId = "org-123";
  const mockLeaveTypeId = "leave-type-abc";

  beforeEach(() => {
    mockBlackoutsResponse = [];
    mockBlackoutsError = null;
    vi.clearAllMocks();

    vi.mocked(createClient).mockResolvedValue({
      from(tableName: string) {
        return new MockSupabaseQueryBuilder(tableName) as any;
      },
    } as any);
  });

  it("should allow leave if there are no blackout periods", async () => {
    mockBlackoutsResponse = [];
    await expect(
      assertLeaveDatesAllowed(mockOrgId, mockLeaveTypeId, "2026-12-25", "2026-12-26")
    ).resolves.not.toThrow();
  });

  it("should block leave that overlaps with a blackout period and throw standard user-friendly error", async () => {
    mockBlackoutsResponse = [
      {
        name: "company shutdown",
        start_date: "2026-12-24",
        end_date: "2026-12-31",
        leave_type_ids: null,
      },
    ];

    await expect(
      assertLeaveDatesAllowed(mockOrgId, mockLeaveTypeId, "2026-12-25", "2026-12-26")
    ).rejects.toThrow("Leave cannot be applied during company shutdown period.");
  });

  it("should preserve blackout name suffix if it already contains the word period", async () => {
    mockBlackoutsResponse = [
      {
        name: "Year-End Maintenance Period",
        start_date: "2026-12-24",
        end_date: "2026-12-31",
        leave_type_ids: [],
      },
    ];

    await expect(
      assertLeaveDatesAllowed(mockOrgId, mockLeaveTypeId, "2026-12-25", "2026-12-26")
    ).rejects.toThrow("Leave cannot be applied during Year-End Maintenance Period.");
  });

  it("should only block leave types specified in the leave_type_ids array", async () => {
    mockBlackoutsResponse = [
      {
        name: "Annual Leave Freeze",
        start_date: "2026-12-20",
        end_date: "2026-12-31",
        leave_type_ids: ["annual-leave-uuid"],
      },
    ];

    // Different leave type (e.g. sick leave) should be allowed
    await expect(
      assertLeaveDatesAllowed(mockOrgId, "sick-leave-uuid", "2026-12-25", "2026-12-26")
    ).resolves.not.toThrow();

    // The specified leave type should be blocked
    await expect(
      assertLeaveDatesAllowed(mockOrgId, "annual-leave-uuid", "2026-12-25", "2026-12-26")
    ).rejects.toThrow("Leave cannot be applied during Annual Leave Freeze period.");
  });

  it("should allow leave if the dates do not overlap with the blackout period", async () => {
    mockBlackoutsResponse = [
      {
        name: "company shutdown",
        start_date: "2026-12-24",
        end_date: "2026-12-31",
        leave_type_ids: null,
      },
    ];

    await expect(
      assertLeaveDatesAllowed(mockOrgId, mockLeaveTypeId, "2026-12-01", "2026-12-10")
    ).resolves.not.toThrow();
  });
});
