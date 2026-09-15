import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getNextDateString,
  getShiftEndTimestamp,
  type EmployeeShift,
} from "@/lib/attendance/shift";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/employee/leave", () => ({
  requireEmployeeContext: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireEmployeeContext } from "@/lib/employee/leave";
import { performAutoClockOut } from "@/lib/attendance/auto-clock-out";
import { getTodayAttendance } from "@/lib/employee/attendance";

describe("Shift end timestamp calculation (getShiftEndTimestamp)", () => {
  it("computes the correct next calendar date across month boundaries", () => {
    expect(getNextDateString("2026-09-10")).toBe("2026-09-11");
    expect(getNextDateString("2026-09-30")).toBe("2026-10-01");
    expect(getNextDateString("2026-12-31")).toBe("2027-01-01");
    expect(getNextDateString("2024-02-28")).toBe("2024-02-29"); // leap year
  });

  it("calculates shift end ISO for regular daytime shift on the same work date", () => {
    const shift: EmployeeShift = {
      id: "shift-day",
      name: "Day Shift",
      startTime: "09:00",
      endTime: "18:00",
      graceMinutes: 0,
    };
    const endIso = getShiftEndTimestamp({
      workDate: "2026-09-10",
      shift,
      timeZone: "Asia/Kuala_Lumpur",
    });
    // 18:00 MYT (UTC+8) is 10:00 UTC
    expect(endIso).toBe("2026-09-10T10:00:00.000Z");
  });

  it("calculates shift end ISO for overnight shift on the following calendar day", () => {
    const nightShift: EmployeeShift = {
      id: "shift-night",
      name: "Night Shift",
      startTime: "22:00",
      endTime: "06:00",
      graceMinutes: 0,
    };
    const endIso = getShiftEndTimestamp({
      workDate: "2026-09-10",
      shift: nightShift,
      timeZone: "Asia/Kuala_Lumpur",
    });
    // Shift started 2026-09-10 at 22:00 MYT; ends 2026-09-11 at 06:00 MYT (2026-09-10 22:00 UTC)
    expect(endIso).toBe("2026-09-10T22:00:00.000Z");
  });

  it("falls back to 18:00 end time on work date if no shift is assigned", () => {
    const endIso = getShiftEndTimestamp({
      workDate: "2026-09-10",
      shift: null,
      timeZone: "Asia/Kuala_Lumpur",
    });
    expect(endIso).toBe("2026-09-10T10:00:00.000Z");
  });
});

describe("performAutoClockOut service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("auto clocks out open record whose shift end + buffer has elapsed", async () => {
    const openRecord = {
      id: "rec-1",
      organization_id: "org-1",
      employee_id: "emp-1",
      work_date: "2026-09-10",
      session: 1,
      clock_in_at: "2026-09-10T01:00:00.000Z", // 09:00 MYT
      clock_out_at: null,
      status: "present",
    };

    let updatedPayload: any = null;

    const mockAdmin = {
      from: vi.fn((table: string) => {
        if (table === "attendance_records") {
          return {
            select: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                not: vi.fn().mockResolvedValue({
                  data: [openRecord],
                  error: null,
                }),
              }),
            }),
            update: vi.fn((payload) => {
              updatedPayload = payload;
              return {
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockReturnValue({
                    select: vi.fn().mockResolvedValue({
                      data: [{ id: "rec-1" }],
                      error: null,
                    }),
                  }),
                }),
              };
            }),
          };
        }
        if (table === "organizations") {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [{ id: "org-1", timezone: "Asia/Kuala_Lumpur" }],
                error: null,
              }),
            }),
          };
        }
        if (table === "roster_entries") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        shift_id: "shift-1",
                        shifts: {
                          id: "shift-1",
                          name: "Day",
                          start_time: "09:00:00",
                          end_time: "18:00:00",
                          grace_minutes: 0,
                        },
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        };
      }),
    };

    vi.mocked(createAdminClient).mockReturnValue(mockAdmin as any);

    // asOf is 19:00 MYT (11:00 UTC) -> 1 hour past 18:00 shift end, exceeding 30m buffer
    const asOf = "2026-09-10T11:00:00.000Z";
    const result = await performAutoClockOut({ asOf, bufferMinutes: 30 });

    expect(result.processed).toBe(1);
    expect(result.autoClockedOut).toBe(1);
    expect(updatedPayload).toEqual({
      clock_out_at: "2026-09-10T10:00:00.000Z", // Scheduled 18:00 MYT shift end
      is_auto_clock_out: true,
    });
  });

  it("leaves record open if shift has not ended yet or is within buffer", async () => {
    const openRecord = {
      id: "rec-2",
      organization_id: "org-1",
      employee_id: "emp-2",
      work_date: "2026-09-10",
      session: 1,
      clock_in_at: "2026-09-10T01:00:00.000Z", // 09:00 MYT
      clock_out_at: null,
      status: "present",
    };

    const mockAdmin = {
      from: vi.fn((table: string) => {
        if (table === "attendance_records") {
          return {
            select: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                not: vi.fn().mockResolvedValue({
                  data: [openRecord],
                  error: null,
                }),
              }),
            }),
            update: vi.fn(),
          };
        }
        if (table === "organizations") {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [{ id: "org-1", timezone: "Asia/Kuala_Lumpur" }],
                error: null,
              }),
            }),
          };
        }
        if (table === "roster_entries") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        shift_id: "shift-1",
                        shifts: {
                          id: "shift-1",
                          name: "Day",
                          start_time: "09:00:00",
                          end_time: "18:00:00",
                          grace_minutes: 0,
                        },
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        };
      }),
    };

    vi.mocked(createAdminClient).mockReturnValue(mockAdmin as any);

    // asOf is 17:30 MYT (09:30 UTC) -> shift still ongoing
    const asOf = "2026-09-10T09:30:00.000Z";
    const result = await performAutoClockOut({ asOf, bufferMinutes: 30 });

    expect(result.processed).toBe(1);
    expect(result.autoClockedOut).toBe(0);
    expect(mockAdmin.from("attendance_records").update).not.toHaveBeenCalled();
  });

  it("handles overnight shifts by waiting until next day end time before auto clocking out", async () => {
    const openNightRecord = {
      id: "rec-night",
      organization_id: "org-1",
      employee_id: "emp-night",
      work_date: "2026-09-10",
      session: 1,
      clock_in_at: "2026-09-10T14:00:00.000Z", // 22:00 MYT
      clock_out_at: null,
      status: "present",
    };

    let updatedPayload: any = null;

    const mockAdmin = {
      from: vi.fn((table: string) => {
        if (table === "attendance_records") {
          return {
            select: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                not: vi.fn().mockResolvedValue({
                  data: [openNightRecord],
                  error: null,
                }),
              }),
            }),
            update: vi.fn((payload) => {
              updatedPayload = payload;
              return {
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockReturnValue({
                    select: vi.fn().mockResolvedValue({
                      data: [{ id: "rec-night" }],
                      error: null,
                    }),
                  }),
                }),
              };
            }),
          };
        }
        if (table === "organizations") {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [{ id: "org-1", timezone: "Asia/Kuala_Lumpur" }],
                error: null,
              }),
            }),
          };
        }
        if (table === "roster_entries") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        shift_id: "shift-night",
                        shifts: {
                          id: "shift-night",
                          name: "Night",
                          start_time: "22:00:00",
                          end_time: "06:00:00",
                          grace_minutes: 0,
                        },
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        };
      }),
    };

    vi.mocked(createAdminClient).mockReturnValue(mockAdmin as any);

    // Test 1: At 03:00 MYT (2026-09-10 19:00 UTC) -> should NOT clock out
    const midNightAsOf = "2026-09-10T19:00:00.000Z";
    const midResult = await performAutoClockOut({ asOf: midNightAsOf, bufferMinutes: 0 });
    expect(midResult.autoClockedOut).toBe(0);

    // Test 2: At 07:00 MYT next morning (2026-09-10 23:00 UTC) -> shift ended at 06:00 MYT (22:00 UTC)
    const morningAsOf = "2026-09-10T23:00:00.000Z";
    const finalResult = await performAutoClockOut({ asOf: morningAsOf, bufferMinutes: 0 });
    expect(finalResult.autoClockedOut).toBe(1);
    expect(updatedPayload).toEqual({
      clock_out_at: "2026-09-10T22:00:00.000Z", // 06:00 MYT on 2026-09-11
      is_auto_clock_out: true,
    });
  });

  it("is completely idempotent when there are no open records", async () => {
    const mockAdmin = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            not: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
    };
    vi.mocked(createAdminClient).mockReturnValue(mockAdmin as any);

    const result = await performAutoClockOut();
    expect(result.processed).toBe(0);
    expect(result.autoClockedOut).toBe(0);
    expect(result.details).toEqual([]);
  });
});

vi.mock("@/lib/employee/attendance-context", () => ({
  getEmployeeAttendanceContext: vi.fn().mockResolvedValue({
    geofence: null,
    locationModuleEnabled: false,
  }),
}));

vi.mock("@/lib/attendance/geofence", () => ({
  validateGeofenceClockIn: vi.fn().mockReturnValue({ ok: true, status: "present" }),
}));

import { clockIn } from "@/lib/employee/attendance";

describe("clockIn JIT past stale session auto clock-out", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(requireEmployeeContext).mockResolvedValue({
      organizationId: "org-1",
      employeeId: "emp-1",
      session: { user: { id: "user-1" } } as any,
    });
  });

  it("auto-closes unclosed session from past dates when clocking in for a new shift", async () => {
    const pastUnclosedRecord = {
      id: "rec-stale-1",
      work_date: "2026-09-08",
      clock_in_at: "2026-09-08T01:00:00.000Z", // 09:00 MYT
    };

    let updatedClockOut: any = null;
    let insertedRecord: any = null;

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "attendance_records") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockImplementation(() =>
                      Promise.resolve({
                        data: insertedRecord ? [insertedRecord] : [],
                        error: null,
                      }),
                    ),
                  }),
                  lt: vi.fn().mockReturnValue({
                    is: vi.fn().mockResolvedValue({
                      data: [pastUnclosedRecord],
                      error: null,
                    }),
                  }),
                  in: vi.fn().mockReturnValue({
                    order: vi.fn().mockReturnValue({
                      order: vi.fn().mockResolvedValue({
                        data: [], // Today & yesterday have no open sessions
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
            update: vi.fn((payload) => {
              updatedClockOut = payload;
              return {
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockResolvedValue({
                    data: [{ id: "rec-stale-1" }],
                    error: null,
                  }),
                }),
              };
            }),
            insert: vi.fn((record) => {
              insertedRecord = record;
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: "rec-today-1",
                      work_date: record.work_date,
                      session: record.session,
                      clock_in_at: record.clock_in_at,
                      clock_out_at: null,
                      status: record.status,
                    },
                    error: null,
                  }),
                }),
              };
            }),
          };
        }
        if (table === "roster_entries") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        shift_id: "shift-1",
                        shifts: {
                          id: "shift-1",
                          name: "Standard Day",
                          start_time: "09:00:00",
                          end_time: "18:00:00",
                          grace_minutes: 0,
                        },
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        };
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    await clockIn();

    // Past unclosed session was auto-closed at scheduled shift end with is_auto_clock_out: true
    expect(updatedClockOut).not.toBeNull();
    expect(updatedClockOut.is_auto_clock_out).toBe(true);
    expect(updatedClockOut.clock_out_at).toBe("2026-09-08T10:00:00.000Z"); // 18:00 MYT on 2026-09-08
    // Today's new session was inserted successfully
    expect(insertedRecord).not.toBeNull();
    expect(insertedRecord.session).toBe(1);
  });
});

describe("/api/cron/auto-clock-out route handler", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
  });

  afterAll(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it("returns 401 Unauthorized when authorization header does not match CRON_SECRET", async () => {
    const { GET } = await import("@/app/api/cron/auto-clock-out/route");
    const request = new Request("http://localhost/api/cron/auto-clock-out", {
      headers: { authorization: "Bearer invalid-token" },
    });

    const response = await GET(request);
    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("succeeds and executes performAutoClockOut when authorized", async () => {
    const mockAdmin = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            not: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
    };
    vi.mocked(createAdminClient).mockReturnValue(mockAdmin as any);

    const { GET } = await import("@/app/api/cron/auto-clock-out/route");
    const request = new Request("http://localhost/api/cron/auto-clock-out?bufferMinutes=15", {
      headers: { authorization: "Bearer test-secret" },
    });

    const response = await GET(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.processed).toBe(0);
    expect(json.autoClockedOut).toBe(0);
    expect(json.elapsedMs).toBeDefined();
  });
});
