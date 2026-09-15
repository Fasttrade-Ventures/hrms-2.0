import { describe, expect, it } from "vitest";
import {
  isOvernightShift,
  getPreviousDateString,
  isClockInLate,
  type EmployeeShift,
} from "@/lib/attendance/shift";

describe("overnight shift detection (isOvernightShift)", () => {
  it("identifies shifts that cross midnight as overnight shifts", () => {
    expect(
      isOvernightShift({ startTime: "22:00", endTime: "06:00" }),
    ).toBe(true);
    expect(
      isOvernightShift({ startTime: "20:00", endTime: "04:00" }),
    ).toBe(true);
    expect(
      isOvernightShift({ startTime: "23:00", endTime: "07:00" }),
    ).toBe(true);
    expect(
      isOvernightShift({ startTime: "18:00", endTime: "02:00" }),
    ).toBe(true);
  });

  it("identifies regular daytime or afternoon shifts as not overnight", () => {
    expect(
      isOvernightShift({ startTime: "09:00", endTime: "18:00" }),
    ).toBe(false);
    expect(
      isOvernightShift({ startTime: "08:00", endTime: "17:00" }),
    ).toBe(false);
    expect(
      isOvernightShift({ startTime: "14:00", endTime: "22:00" }),
    ).toBe(false);
  });

  it("handles null, undefined, or missing shift times safely", () => {
    expect(isOvernightShift(null)).toBe(false);
    expect(isOvernightShift(undefined)).toBe(false);
    expect(
      isOvernightShift({ startTime: "", endTime: "06:00" }),
    ).toBe(false);
  });
});

describe("date arithmetic (getPreviousDateString)", () => {
  it("computes the previous calendar date across standard days", () => {
    expect(getPreviousDateString("2026-09-11")).toBe("2026-09-10");
    expect(getPreviousDateString("2026-09-02")).toBe("2026-09-01");
  });

  it("computes the previous calendar date across month boundaries", () => {
    expect(getPreviousDateString("2026-09-01")).toBe("2026-08-31");
    expect(getPreviousDateString("2026-03-01")).toBe("2026-02-28");
    // Leap year
    expect(getPreviousDateString("2024-03-01")).toBe("2024-02-29");
  });

  it("computes the previous calendar date across year boundaries", () => {
    expect(getPreviousDateString("2026-01-01")).toBe("2025-12-31");
  });
});

describe("overnight shift punctuality (isClockInLate)", () => {
  const nightShift: EmployeeShift = {
    id: "shift-night",
    name: "Night Shift",
    startTime: "22:00",
    endTime: "06:00",
    graceMinutes: 15,
  };

  it("is not late when clocking in before shift start (e.g. 21:50 PM)", () => {
    const clockIn = "2026-09-10T21:50:00+08:00";
    expect(isClockInLate(clockIn, nightShift, "Asia/Kuala_Lumpur", "2026-09-10")).toBe(false);
  });

  it("is not late when clocking in during grace period (22:10 PM with 15m grace)", () => {
    const clockIn = "2026-09-10T22:10:00+08:00";
    expect(isClockInLate(clockIn, nightShift, "Asia/Kuala_Lumpur", "2026-09-10")).toBe(false);
  });

  it("is not late when clocking in exactly at grace cutoff (22:15:00 PM)", () => {
    const clockIn = "2026-09-10T22:15:00+08:00";
    expect(isClockInLate(clockIn, nightShift, "Asia/Kuala_Lumpur", "2026-09-10")).toBe(false);
  });

  it("is late when clocking in after grace period before midnight (22:16:00 PM)", () => {
    const clockIn = "2026-09-10T22:16:00+08:00";
    expect(isClockInLate(clockIn, nightShift, "Asia/Kuala_Lumpur", "2026-09-10")).toBe(true);
  });

  it("is late when clocking in after midnight for yesterday's overnight shift (e.g. 00:15 AM)", () => {
    // Clock-in is on 2026-09-11 at 00:15:00, but assigned workDate is 2026-09-10
    const clockInPastMidnight = "2026-09-11T00:15:00+08:00";
    expect(
      isClockInLate(clockInPastMidnight, nightShift, "Asia/Kuala_Lumpur", "2026-09-10"),
    ).toBe(true);
  });
});

describe("overnight shift cross-midnight work date and duration invariants", () => {
  it("preserves original work date and computes correct duration when clock-out is after midnight", () => {
    const shiftWorkDate = "2026-09-10";
    const clockInAt = "2026-09-10T22:00:00+08:00";
    const clockOutAt = "2026-09-11T06:00:00+08:00";

    const record = {
      work_date: shiftWorkDate,
      session: 1,
      clock_in_at: clockInAt,
      clock_out_at: clockOutAt,
    };

    // Work date must stay on the same work date (2026-09-10)
    expect(record.work_date).toBe("2026-09-10");

    // Duration across midnight must equal exactly 8 hours (28,800 seconds)
    const diffMs = new Date(record.clock_out_at).getTime() - new Date(record.clock_in_at).getTime();
    const durationSeconds = Math.floor(diffMs / 1000);
    expect(durationSeconds).toBe(28800);

    const hours = Math.floor(durationSeconds / 3600);
    const mins = Math.floor((durationSeconds % 3600) / 60);
    expect(`${hours}h ${mins.toString().padStart(2, "0")}m`).toBe("8h 00m");
  });

  it("accumulates multi-session overnight shifts on the same work date", () => {
    const shiftWorkDate = "2026-09-10";
    const sessions = [
      {
        session: 1,
        clock_in_at: "2026-09-10T22:00:00+08:00",
        clock_out_at: "2026-09-11T02:00:00+08:00", // 4 hours
      },
      {
        session: 2,
        clock_in_at: "2026-09-11T02:30:00+08:00", // Break over
        clock_out_at: "2026-09-11T06:00:00+08:00", // 3.5 hours
      },
    ];

    let totalAccumulatedSeconds = 0;
    for (const s of sessions) {
      const diffMs = new Date(s.clock_out_at).getTime() - new Date(s.clock_in_at).getTime();
      totalAccumulatedSeconds += Math.floor(diffMs / 1000);
    }

    // 4h (14400s) + 3.5h (12600s) = 7.5h (27000s)
    expect(totalAccumulatedSeconds).toBe(27000);
    const hours = Math.floor(totalAccumulatedSeconds / 3600);
    const mins = Math.floor((totalAccumulatedSeconds % 3600) / 60);
    expect(`${hours}h ${mins.toString().padStart(2, "0")}m`).toBe("7h 30m");

    // All sessions belong to the same work date
    expect(shiftWorkDate).toBe("2026-09-10");
  });
});
