import { describe, expect, it } from "vitest";

import {
  expandMalaysiaReplacementHolidayDates,
  expandMalaysiaReplacementHolidays,
  nextWorkingDay,
} from "./malaysia-replacement";

describe("expandMalaysiaReplacementHolidays", () => {
  it("adds Monday when a KL/Selangor (sat_sun) holiday falls on Sunday", () => {
    // 2026-11-08 Deepavali is Sunday → Monday 2026-11-09
    const result = expandMalaysiaReplacementHolidays(
      [{ holidayDate: "2026-11-08", name: "Deepavali" }],
      "sat_sun",
    );
    expect(result.map((row) => row.holidayDate)).toEqual(["2026-11-08", "2026-11-09"]);
    expect(result[1]?.name).toContain("Replacement");
  });

  it("does not add Monday for a Saturday-only holiday under sat_sun", () => {
    // 2025-08-31 National Day was Saturday in some years — no Monday replacement
    const result = expandMalaysiaReplacementHolidays(
      [{ holidayDate: "2025-08-30", name: "Saturday holiday" }], // force Saturday
      "sat_sun",
    );
    // 2025-08-30 is Saturday
    expect(result.map((row) => row.holidayDate)).toEqual(["2025-08-30"]);
  });

  it("skips replacement when Monday is already a holiday", () => {
    const result = expandMalaysiaReplacementHolidays(
      [
        { holidayDate: "2026-05-31", name: "Vesak Day" }, // Sunday
        { holidayDate: "2026-06-01", name: "Yang di-Pertuan Agong's Birthday" },
      ],
      "sat_sun",
    );
    expect(result.filter((row) => row.holidayDate === "2026-06-01")).toHaveLength(1);
    expect(result.some((row) => row.name.includes("Replacement"))).toBe(false);
  });

  it("for fri_sat, Saturday PH gets Sunday replacement", () => {
    // 2026-03-21 is Saturday
    const result = expandMalaysiaReplacementHolidays(
      [{ holidayDate: "2026-03-21", name: "Eid al-Fitr" }],
      "fri_sat",
    );
    expect(result.map((row) => row.holidayDate)).toEqual(["2026-03-21", "2026-03-22"]);
  });
});

describe("nextWorkingDay", () => {
  it("moves from Sunday to Monday under sat_sun", () => {
    expect(nextWorkingDay("2026-11-08", "sat_sun")).toBe("2026-11-09");
  });
});

describe("expandMalaysiaReplacementHolidayDates", () => {
  it("expands date-only lists", () => {
    expect(expandMalaysiaReplacementHolidayDates(["2025-08-31"], "sat_sun")).toEqual([
      "2025-08-31",
      "2025-09-01",
    ]);
  });
});
