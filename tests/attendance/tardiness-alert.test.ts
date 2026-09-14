import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getShiftStartTimestamp,
  getShiftGraceCutoffTimestamp,
  isPastGraceCutoff,
  type EmployeeShift,
} from "@/lib/attendance/shift";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/notifications/queue", () => ({
  queueNotification: vi.fn().mockResolvedValue(undefined),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { queueNotification } from "@/lib/notifications/queue";
import { performTardinessAlertSweep } from "@/lib/attendance/tardiness-alert";
import { GET as cronRouteHandler } from "@/app/api/cron/attendance-tardiness/route";

describe("Shift start & grace cutoff calculation utilities", () => {
  const standardShift: EmployeeShift = {
    id: "shift-std",
    name: "Standard Daytime",
    startTime: "09:00",
    endTime: "18:00",
    graceMinutes: 15,
  };

  it("calculates exact shift start ISO in local organization timezone", () => {
    // 09:00 MYT (UTC+8) is 01:00 UTC
    const startIso = getShiftStartTimestamp({
      workDate: "2026-09-14",
      shift: standardShift,
      timeZone: "Asia/Kuala_Lumpur",
    });
    expect(startIso).toBe("2026-09-14T01:00:00.000Z");
  });

  it("calculates shift grace cutoff ISO timestamp correctly with grace period", () => {
    // 09:00 MYT + 15m grace = 09:15 MYT -> 01:15 UTC
    const cutoffIso = getShiftGraceCutoffTimestamp({
      workDate: "2026-09-14",
      shift: standardShift,
      timeZone: "Asia/Kuala_Lumpur",
    });
    expect(cutoffIso).toBe("2026-09-14T01:15:00.000Z");
  });

  it("calculates grace cutoff for strict 0-grace shifts", () => {
    const strictShift: EmployeeShift = {
      id: "shift-strict",
      name: "Strict",
      startTime: "09:00",
      endTime: "18:00",
      graceMinutes: 0,
    };
    const cutoffIso = getShiftGraceCutoffTimestamp({
      workDate: "2026-09-14",
      shift: strictShift,
      timeZone: "Asia/Kuala_Lumpur",
    });
    expect(cutoffIso).toBe("2026-09-14T01:00:00.000Z");
  });

  it("evaluates isPastGraceCutoff with exact boundary precision", () => {
    const options = {
      workDate: "2026-09-14",
      shift: standardShift,
      timeZone: "Asia/Kuala_Lumpur",
    };

    // 08:50 MYT -> before start
    expect(isPastGraceCutoff({ ...options, asOf: "2026-09-14T00:50:00.000Z" })).toBe(false);

    // 09:00 MYT -> at start
    expect(isPastGraceCutoff({ ...options, asOf: "2026-09-14T01:00:00.000Z" })).toBe(false);

    // 09:10 MYT -> during grace period
    expect(isPastGraceCutoff({ ...options, asOf: "2026-09-14T01:10:00.000Z" })).toBe(false);

    // 09:15:00.000Z -> exactly at grace cutoff threshold
    expect(isPastGraceCutoff({ ...options, asOf: "2026-09-14T01:15:00.000Z" })).toBe(false);

    // 09:15:01.000Z -> 1 second past grace cutoff
    expect(isPastGraceCutoff({ ...options, asOf: "2026-09-14T01:15:01.000Z" })).toBe(true);

    // 09:30:00.000Z -> well past grace cutoff
    expect(isPastGraceCutoff({ ...options, asOf: "2026-09-14T01:30:00.000Z" })).toBe(true);
  });
});

describe("performTardinessAlertSweep business service", () => {
  const orgId = "org-demo-1";
  const asOf = "2026-09-14T01:30:00.000Z"; // 09:30 MYT -> past 09:15 cutoff

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createMockSupabase(overrides: {
    employees?: any[];
    rosterEntries?: any[];
    defaultShifts?: any[];
    attendanceRecords?: any[];
    leaveRequests?: any[];
    lateRequests?: any[];
    memberships?: any[];
  } = {}) {
    const employees = overrides.employees ?? [
      {
        id: "emp-1",
        organization_id: orgId,
        full_name: "Tardy Employee",
        email: "tardy@example.com",
        shift_id: "shift-1",
      },
    ];

    const rosterEntries = overrides.rosterEntries ?? [];
    const defaultShifts = overrides.defaultShifts ?? [
      {
        id: "shift-1",
        name: "Standard Daytime",
        start_time: "09:00:00",
        end_time: "18:00:00",
        grace_minutes: 15,
      },
    ];
    const attendanceRecords = overrides.attendanceRecords ?? [];
    const leaveRequests = overrides.leaveRequests ?? [];
    const lateRequests = overrides.lateRequests ?? [];
    const memberships = overrides.memberships ?? [
      {
        employee_id: "emp-1",
        user_id: "user-1",
      },
    ];

    return {
      from: vi.fn((table: string) => {
        if (table === "organizations") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ id: orgId, timezone: "Asia/Kuala_Lumpur" }],
                error: null,
              }),
            }),
          };
        }
        if (table === "employees") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: employees,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "roster_entries") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: rosterEntries,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "shifts") {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: defaultShifts,
                error: null,
              }),
            }),
          };
        }
        if (table === "attendance_records") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  not: vi.fn().mockResolvedValue({
                    data: attendanceRecords,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "leave_requests") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  lte: vi.fn().mockReturnValue({
                    gte: vi.fn().mockResolvedValue({
                      data: leaveRequests,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "late_requests") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  in: vi.fn().mockResolvedValue({
                    data: lateRequests,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "organization_memberships") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                not: vi.fn().mockResolvedValue({
                  data: memberships,
                  error: null,
                }),
              }),
            }),
          };
        }
        throw new Error(`Unexpected table queried: ${table}`);
      }),
    };
  }

  it("queues a tardiness alert for an unclocked employee past shift grace cutoff", async () => {
    const mockSupabase = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);

    const result = await performTardinessAlertSweep({
      organizationId: orgId,
      asOf,
    });

    expect(result.processed).toBe(1);
    expect(result.alertsSent).toBe(1);
    expect(result.details[0]).toMatchObject({
      employeeId: "emp-1",
      employeeName: "Tardy Employee",
      workDate: "2026-09-14",
      shiftName: "Standard Daytime",
      shiftStart: "09:00",
      graceMinutes: 15,
      userId: "user-1",
    });

    expect(queueNotification).toHaveBeenCalledTimes(1);
    expect(queueNotification).toHaveBeenCalledWith({
      organizationId: orgId,
      recipientUserId: "user-1",
      channel: "in_app",
      template: "attendance.tardy",
      payload: expect.objectContaining({
        workDate: "2026-09-14",
        shiftName: "Standard Daytime",
        shiftStart: "09:00",
        graceMinutes: 15,
        href: "/employee/attendance",
      }),
      idempotencyKey: "attendance-tardiness-emp-1-2026-09-14",
    });
  });

  it("skips employee who has already clocked in today", async () => {
    const mockSupabase = createMockSupabase({
      attendanceRecords: [{ employee_id: "emp-1" }],
    });
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);

    const result = await performTardinessAlertSweep({
      organizationId: orgId,
      asOf,
    });

    expect(result.processed).toBe(1);
    expect(result.alertsSent).toBe(0);
    expect(queueNotification).not.toHaveBeenCalled();
  });

  it("skips employee who is on approved leave today", async () => {
    const mockSupabase = createMockSupabase({
      leaveRequests: [{ employee_id: "emp-1" }],
    });
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);

    const result = await performTardinessAlertSweep({
      organizationId: orgId,
      asOf,
    });

    expect(result.processed).toBe(1);
    expect(result.alertsSent).toBe(0);
    expect(queueNotification).not.toHaveBeenCalled();
  });

  it("skips employee who has already submitted a late report for today", async () => {
    const mockSupabase = createMockSupabase({
      lateRequests: [{ employee_id: "emp-1" }],
    });
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);

    const result = await performTardinessAlertSweep({
      organizationId: orgId,
      asOf,
    });

    expect(result.processed).toBe(1);
    expect(result.alertsSent).toBe(0);
    expect(queueNotification).not.toHaveBeenCalled();
  });

  it("skips employee when current time is still within grace period", async () => {
    const mockSupabase = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);

    // 09:10 MYT -> grace cutoff is 09:15 MYT
    const earlyAsOf = "2026-09-14T01:10:00.000Z";
    const result = await performTardinessAlertSweep({
      organizationId: orgId,
      asOf: earlyAsOf,
    });

    expect(result.processed).toBe(1);
    expect(result.alertsSent).toBe(0);
    expect(queueNotification).not.toHaveBeenCalled();
  });

  it("skips employee who has no assigned shift", async () => {
    const mockSupabase = createMockSupabase({
      employees: [
        {
          id: "emp-no-shift",
          organization_id: orgId,
          full_name: "No Shift Employee",
          email: "noshift@example.com",
          shift_id: null,
        },
      ],
      rosterEntries: [],
    });
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);

    const result = await performTardinessAlertSweep({
      organizationId: orgId,
      asOf,
    });

    expect(result.processed).toBe(1);
    expect(result.alertsSent).toBe(0);
    expect(queueNotification).not.toHaveBeenCalled();
  });
});

describe("/api/cron/attendance-tardiness cron endpoint", () => {
  const originalEnv = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = "test-cron-secret";
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalEnv;
  });

  it("rejects unauthorized calls with 401 when CRON_SECRET is set", async () => {
    const req = new Request("http://localhost:3000/api/cron/attendance-tardiness", {
      method: "GET",
      headers: {
        authorization: "Bearer wrong-secret",
      },
    });

    const res = await cronRouteHandler(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("accepts valid bearer authorization and runs sweep", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
    };
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);

    const req = new Request("http://localhost:3000/api/cron/attendance-tardiness?orgId=org-1", {
      method: "GET",
      headers: {
        authorization: "Bearer test-cron-secret",
      },
    });

    const res = await cronRouteHandler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.elapsedMs).toBe("number");
  });
});
