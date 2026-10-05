import { describe, expect, it } from "vitest";

import { planHolidayChanges } from "../../apps/web/src/lib/hr/malaysia-holidays-api";
import { isAnniversaryOn, isBirthdayOn } from "../../apps/web/src/lib/employees/celebrations";
import { assertGoalCount, assertPulseScore, averageScore } from "../../apps/web/src/lib/hr/pulse";

describe("planHolidayChanges", () => {
  it("inserts a new date, updates a changed name, and skips an unchanged row", () => {
    const first = planHolidayChanges(
      [{ id: "h1", holidayDate: "2026-01-01", name: "New Year" }],
      [
        { holidayDate: "2026-01-01", name: "New Year's Day" },
        { holidayDate: "2026-05-01", name: "Labour Day" },
      ],
    );
    expect(first.toInsert).toEqual([{ holidayDate: "2026-05-01", name: "Labour Day" }]);
    expect(first.toUpdate).toEqual([{ id: "h1", name: "New Year · New Year's Day" }]);
    expect(first.skipped).toBe(0);

    const second = planHolidayChanges(
      [
        { id: "h1", holidayDate: "2026-01-01", name: "New Year · New Year's Day" },
        { id: "h2", holidayDate: "2026-05-01", name: "Labour Day" },
      ],
      [
        { holidayDate: "2026-01-01", name: "New Year · New Year's Day" },
        { holidayDate: "2026-05-01", name: "Labour Day" },
      ],
    );
    expect(second.toInsert).toEqual([]);
    expect(second.toUpdate).toEqual([]);
    expect(second.skipped).toBe(2);
  });
});

describe("celebrations", () => {
  it("matches a birthday on the same month and day in any year", () => {
    expect(isBirthdayOn("1992-10-06", "2026-10-06")).toBe(true);
    expect(isBirthdayOn(null, "2026-10-06")).toBe(false);
    expect(isBirthdayOn("1992-10-07", "2026-10-06")).toBe(false);
  });

  it("does not treat a join date in the current year as an anniversary", () => {
    expect(isAnniversaryOn("2026-10-06", "2026-10-06")).toBe(false);
    expect(isAnniversaryOn("2020-10-06", "2026-10-06")).toBe(true);
  });
});

describe("pulse scores", () => {
  it("rejects a score outside 0 to 10", () => {
    expect(() => assertPulseScore(11)).toThrow(/0 to 10/);
    expect(() => assertPulseScore(8)).not.toThrow();
  });

  it("averages 8 and 10 as 9", () => {
    expect(averageScore([8, 10])).toBe(9);
  });

  it("rejects a sixth goal", () => {
    expect(() => assertGoalCount(5)).toThrow(/5 goals/);
    expect(() => assertGoalCount(4)).not.toThrow();
  });
});
