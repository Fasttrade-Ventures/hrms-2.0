import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/leave/accrual", () => ({
  performMonthlyLeaveAccrual: vi.fn().mockResolvedValue({
    processedCount: 2,
    skippedCount: 0,
    totalAccruedDays: 2.34,
    auditLogIds: ["log-1", "log-2"],
  }),
}));

vi.mock("@/lib/leave/rollover", () => ({
  performYearEndCarryForward: vi.fn().mockResolvedValue({
    processedCount: 1,
    skippedCount: 0,
    totalCarriedDays: 5,
    totalForfeitedDays: 2,
    auditLogIds: ["cf-1"],
  }),
  performCarryForwardExpiry: vi.fn().mockResolvedValue({
    expiredCount: 1,
    skippedCount: 0,
    totalExpiredDays: 3,
    auditLogIds: ["exp-1"],
  }),
}));

vi.mock("@/lib/leave/balance-reminders", () => ({
  performLeaveBalanceReminders: vi.fn().mockResolvedValue({
    remindedCount: 4,
    skippedCount: 1,
  }),
}));

vi.mock("@/lib/notifications/process-outbox", () => ({
  processNotificationOutbox: vi.fn().mockResolvedValue(2),
}));

describe("Leave Background Cron Endpoints", () => {
  const originalEnv = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret-123";
  });

  afterAll(() => {
    process.env.CRON_SECRET = originalEnv;
  });

  describe("GET /api/cron/leave-accrual", () => {
    it("rejects unauthorized requests with 401 when CRON_SECRET is set", async () => {
      const { GET } = await import("@/app/api/cron/leave-accrual/route");
      const req = new Request("http://localhost/api/cron/leave-accrual", {
        headers: { authorization: "Bearer wrong-secret" },
      });

      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("executes successfully with valid authorization", async () => {
      const { GET } = await import("@/app/api/cron/leave-accrual/route");
      const req = new Request("http://localhost/api/cron/leave-accrual?asOf=2026-10-01", {
        headers: { authorization: "Bearer test-secret-123" },
      });

      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.processedCount).toBe(2);
      expect(json.totalAccruedDays).toBe(2.34);
    });
  });

  describe("GET /api/cron/leave-rollover", () => {
    it("rejects unauthorized requests with 401", async () => {
      const { GET } = await import("@/app/api/cron/leave-rollover/route");
      const req = new Request("http://localhost/api/cron/leave-rollover", {
        headers: { authorization: "Bearer invalid" },
      });

      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("executes rollover and expiry successfully with valid authorization", async () => {
      const { GET } = await import("@/app/api/cron/leave-rollover/route");
      const req = new Request("http://localhost/api/cron/leave-rollover?targetYear=2027", {
        headers: { authorization: "Bearer test-secret-123" },
      });

      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.carryForward.totalCarriedDays).toBe(5);
      expect(json.expiry.totalExpiredDays).toBe(3);
    });
  });

  describe("GET /api/cron/leave-balance-reminders", () => {
    it("rejects unauthorized requests with 401", async () => {
      const { GET } = await import("@/app/api/cron/leave-balance-reminders/route");
      const req = new Request("http://localhost/api/cron/leave-balance-reminders", {
        headers: { authorization: "Bearer invalid" },
      });

      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("queues reminders with valid authorization", async () => {
      const { GET } = await import("@/app/api/cron/leave-balance-reminders/route");
      const req = new Request("http://localhost/api/cron/leave-balance-reminders?asOf=2026-06-10", {
        headers: { authorization: "Bearer test-secret-123" },
      });

      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.remindedCount).toBe(4);
      expect(json.notificationsSent).toBe(2);
    });
  });
});
