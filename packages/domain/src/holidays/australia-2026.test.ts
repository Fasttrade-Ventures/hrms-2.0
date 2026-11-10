import { describe, expect, it } from "vitest";

import {
  AUSTRALIAN_STATES,
  australianHolidays2026,
  holidayRowsToInsert,
  normalizeAustralianState,
} from "./australia-2026";

const NSW_REQUIRED = [
  "2026-01-01",
  "2026-01-26",
  "2026-04-03",
  "2026-04-06",
  "2026-04-25",
  "2026-04-27",
  "2026-12-25",
  "2026-12-26",
  "2026-12-28",
];

describe("australianHolidays2026", () => {
  it("includes the national days and weekend substitutes for NSW", () => {
    const dates = australianHolidays2026("NSW").map((h) => h.holidayDate);
    for (const date of NSW_REQUIRED) {
      expect(dates).toContain(date);
    }
  });

  it("includes NSW state days", () => {
    const rows = australianHolidays2026("NSW");
    expect(rows.find((h) => h.name === "King's Birthday")?.holidayDate).toBe("2026-06-08");
    expect(rows.find((h) => h.name === "Labour Day")?.holidayDate).toBe("2026-10-05");
    expect(rows.find((h) => h.name === "Easter Saturday")?.holidayDate).toBe("2026-04-04");
  });

  it("uses each state's own Labour Day equivalent and King's Birthday", () => {
    const byState = (state: Parameters<typeof australianHolidays2026>[0], name: string) =>
      australianHolidays2026(state).find((h) => h.name === name)?.holidayDate;
    expect(byState("WA", "King's Birthday")).toBe("2026-09-28");
    expect(byState("QLD", "King's Birthday")).toBe("2026-10-05");
    expect(byState("QLD", "Labour Day")).toBe("2026-05-04");
    expect(byState("WA", "Labour Day")).toBe("2026-03-02");
    expect(byState("VIC", "Labour Day")).toBe("2026-03-09");
    expect(byState("ACT", "Canberra Day")).toBe("2026-03-09");
    expect(byState("TAS", "Eight Hours Day")).toBe("2026-03-09");
    expect(byState("NT", "May Day")).toBe("2026-05-04");
  });

  it("does not add Easter Saturday where the state does not observe it", () => {
    for (const state of ["WA", "TAS"] as const) {
      expect(australianHolidays2026(state).map((h) => h.holidayDate)).not.toContain("2026-04-04");
    }
  });

  it("has no duplicate date and name inside one state's list", () => {
    for (const state of AUSTRALIAN_STATES) {
      const keys = australianHolidays2026(state).map((h) => `${h.holidayDate}|${h.name}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("has one holiday per date inside a state (matches the branch/date unique index)", () => {
    for (const state of AUSTRALIAN_STATES) {
      const dates = australianHolidays2026(state).map((h) => h.holidayDate);
      expect(new Set(dates).size).toBe(dates.length);
    }
  });

  it("only contains 2026 dates", () => {
    for (const state of AUSTRALIAN_STATES) {
      for (const h of australianHolidays2026(state)) {
        expect(h.holidayDate.startsWith("2026-")).toBe(true);
      }
    }
  });
});

describe("normalizeAustralianState", () => {
  it("accepts codes and full names, ignoring case and spacing", () => {
    expect(normalizeAustralianState(" nsw ")).toBe("NSW");
    expect(normalizeAustralianState("New South Wales")).toBe("NSW");
    expect(normalizeAustralianState("Australian Capital Territory")).toBe("ACT");
  });

  it("returns null for blank, null or non-Australian values", () => {
    expect(normalizeAustralianState("")).toBeNull();
    expect(normalizeAustralianState(null)).toBeNull();
    expect(normalizeAustralianState("Selangor")).toBeNull();
  });
});

describe("holidayRowsToInsert", () => {
  const branchId = "branch-1";
  const incoming = australianHolidays2026("NSW").map((h) => ({ ...h, branchId }));

  it("inserts everything when nothing exists", () => {
    expect(holidayRowsToInsert([], incoming)).toHaveLength(incoming.length);
  });

  it("adds no duplicate branch, date and name on a second load", () => {
    const first = holidayRowsToInsert([], incoming);
    const second = holidayRowsToInsert(first, incoming);
    expect(second).toEqual([]);
  });

  it("only inserts the missing rows", () => {
    const existing = incoming.slice(0, 3);
    expect(holidayRowsToInsert(existing, incoming)).toHaveLength(incoming.length - 3);
  });

  it("treats another branch as separate", () => {
    const other = incoming.map((row) => ({ ...row, branchId: "branch-2" }));
    expect(holidayRowsToInsert(incoming, other)).toHaveLength(other.length);
  });

  it("skips a date that a branch already has under another name (unique index)", () => {
    const existing = [{ branchId, holidayDate: "2026-01-01", name: "Company New Year" }];
    const result = holidayRowsToInsert(existing, incoming);
    expect(result.map((r) => r.holidayDate)).not.toContain("2026-01-01");
  });

  it("removes duplicates inside the incoming list", () => {
    const doubled = [...incoming, ...incoming];
    expect(holidayRowsToInsert([], doubled)).toHaveLength(incoming.length);
  });
});
