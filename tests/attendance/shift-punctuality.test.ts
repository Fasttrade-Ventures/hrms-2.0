import { describe, expect, it } from "vitest";
import { isClockInLate } from "@/lib/attendance/shift";

describe("attendance shift punctuality (isClockInLate)", () => {
  const standardShift = {
    id: "shift-1",
    name: "Standard",
    startTime: "09:00",
    endTime: "18:00",
    graceMinutes: 15,
  };

  it("is not late when clocking in before shift start (e.g. 08:50 AM)", () => {
    // 08:50:00 AM in Kuala Lumpur (+08:00) -> 00:50:00Z
    const clockIn = "2026-09-10T08:50:00+08:00";
    expect(isClockInLate(clockIn, standardShift)).toBe(false);
  });

  it("is not late when clocking in exactly at shift start (09:00:00 AM)", () => {
    const clockIn = "2026-09-10T09:00:00+08:00";
    expect(isClockInLate(clockIn, standardShift)).toBe(false);
  });

  it("is not late when clocking in during grace period (09:10:00 AM with 15m grace)", () => {
    const clockIn = "2026-09-10T09:10:00+08:00";
    expect(isClockInLate(clockIn, standardShift)).toBe(false);
  });

  it("is not late when clocking in exactly at grace threshold (09:15:00 AM with 15m grace)", () => {
    const clockIn = "2026-09-10T09:15:00+08:00";
    expect(isClockInLate(clockIn, standardShift)).toBe(false);
  });

  it("is late when clocking in 1 second past grace threshold (09:15:01 AM with 15m grace)", () => {
    const clockIn = "2026-09-10T09:15:01+08:00";
    expect(isClockInLate(clockIn, standardShift)).toBe(true);
  });

  it("is late when clocking in well past grace threshold (09:30:00 AM)", () => {
    const clockIn = "2026-09-10T09:30:00+08:00";
    expect(isClockInLate(clockIn, standardShift)).toBe(true);
  });

  it("handles shifts with 0 grace minutes strictly", () => {
    const strictShift = {
      id: "shift-strict",
      name: "Strict",
      startTime: "09:00",
      endTime: "18:00",
      graceMinutes: 0,
    };
    expect(isClockInLate("2026-09-10T09:00:00+08:00", strictShift)).toBe(false);
    expect(isClockInLate("2026-09-10T09:00:01+08:00", strictShift)).toBe(true);
    expect(isClockInLate("2026-09-10T09:01:00+08:00", strictShift)).toBe(true);
  });

  it("handles custom start times like afternoon shift 14:00 with 10m grace", () => {
    const afternoonShift = {
      id: "shift-afternoon",
      name: "Afternoon",
      startTime: "14:00",
      endTime: "22:00",
      graceMinutes: 10,
    };
    // 14:08 is within 10m grace
    expect(isClockInLate("2026-09-10T14:08:00+08:00", afternoonShift)).toBe(false);
    // 14:10:00 is exact boundary
    expect(isClockInLate("2026-09-10T14:10:00+08:00", afternoonShift)).toBe(false);
    // 14:10:01 is late
    expect(isClockInLate("2026-09-10T14:10:01+08:00", afternoonShift)).toBe(true);
  });

  it("falls back to 09:00 with 0 grace minutes when shift is null or undefined", () => {
    expect(isClockInLate("2026-09-10T08:59:59+08:00", null)).toBe(false);
    expect(isClockInLate("2026-09-10T09:00:00+08:00", null)).toBe(false);
    expect(isClockInLate("2026-09-10T09:00:01+08:00", null)).toBe(true);
  });
});
