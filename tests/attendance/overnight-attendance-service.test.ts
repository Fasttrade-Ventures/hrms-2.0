import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/employee/leave", () => ({
  requireEmployeeContext: vi.fn(),
}));

vi.mock("@/lib/employee/attendance-context", () => ({
  getEmployeeAttendanceContext: vi.fn(),
}));

vi.mock("@/lib/attendance/geofence", () => ({
  validateGeofenceClockIn: vi.fn().mockReturnValue({ ok: true, status: "on_time" }),
}));

import { createClient } from "@/lib/supabase/server";
import { requireEmployeeContext } from "@/lib/employee/leave";
import { getTodayAttendance, clockOut, clockIn } from "@/lib/employee/attendance";

describe("overnight shifts attendance service", () => {
  const mockOrgId = "org-123";
  const mockEmpId = "emp-456";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-11T02:00:00+08:00"));

    vi.mocked(requireEmployeeContext).mockResolvedValue({
      organizationId: mockOrgId,
      employeeId: mockEmpId,
      session: { user: { id: "user-123" } } as any,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("getTodayAttendance returns active session from yesterday when crossing midnight", async () => {
    const yesterdayRecord = {
      id: "rec-yesterday-1",
      work_date: "2026-09-10",
      session: 1,
      clock_in_at: "2026-09-10T22:00:00+08:00",
      clock_out_at: null,
      status: "on_time",
    };

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [yesterdayRecord],
                error: null,
              }),
            }),
          }),
        }),
      }),
    });

    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: mockSelect,
      }),
    } as any);

    const attendance = await getTodayAttendance();

    expect(attendance).not.toBeNull();
    expect(attendance?.id).toBe("rec-yesterday-1");
    // Work date stays on original shift date (2026-09-10)
    expect(attendance?.workDate).toBe("2026-09-10");
    expect(attendance?.clockInAt).toBe("2026-09-10T22:00:00+08:00");
    expect(attendance?.clockOutAt).toBeNull();
  });

  it("clockOut after midnight updates active session and stays on original work date", async () => {
    const activeYesterdayRecord = {
      id: "rec-yesterday-1",
      work_date: "2026-09-10",
      session: 1,
      clock_in_at: "2026-09-10T22:00:00+08:00",
      clock_out_at: null,
      status: "on_time",
    };

    const completedYesterdayRecord = {
      ...activeYesterdayRecord,
      clock_out_at: "2026-09-11T06:00:00+08:00",
    };

    let updatedClockOut: string | null = null;

    const mockFrom = vi.fn((table: string) => {
      if (table === "attendance_records") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    order: vi.fn().mockImplementation(() => {
                      // If clockOut already updated the record, return completedYesterdayRecord
                      const records = updatedClockOut
                        ? [{ ...completedYesterdayRecord, clock_out_at: updatedClockOut }]
                        : [activeYesterdayRecord];
                      return Promise.resolve({ data: records, error: null });
                    }),
                  }),
                }),
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockImplementation(() => {
                    const records = updatedClockOut
                      ? [{ ...completedYesterdayRecord, clock_out_at: updatedClockOut }]
                      : [activeYesterdayRecord];
                    return Promise.resolve({ data: records, error: null });
                  }),
                }),
              }),
            }),
          }),
          update: vi.fn((payload: { clock_out_at: string }) => {
            updatedClockOut = payload.clock_out_at;
            return {
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({
                        data: {
                          id: "rec-yesterday-1",
                          work_date: "2026-09-10",
                          session: 1,
                          clock_in_at: "2026-09-10T22:00:00+08:00",
                          clock_out_at: payload.clock_out_at,
                          status: "on_time",
                        },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            };
          }),
        };
      }
      return {};
    });

    vi.mocked(createClient).mockResolvedValue({
      from: mockFrom,
    } as any);

    const result = await clockOut();

    expect(result).not.toBeNull();
    expect(result.workDate).toBe("2026-09-10");
    expect(result.clockOutAt).toBeDefined();
    expect(result.sessions[0].clockOutAt).toBeDefined();
    // Accumulated duration across midnight is calculated
    expect(result.accumulatedSeconds).toBeGreaterThan(0);
  });
});
