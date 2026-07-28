import { describe, expect, it } from "vitest";

import { appraisalStatusLabel, parseRating } from "../../apps/web/src/lib/performance/types";

describe("parseRating", () => {
  it("accepts integers from 1 to 5", () => {
    expect(parseRating("3")).toBe(3);
    expect(parseRating("1")).toBe(1);
    expect(parseRating("5")).toBe(5);
  });

  it("rejects invalid ratings", () => {
    expect(() => parseRating("0")).toThrow(/1 to 5/);
    expect(() => parseRating("6")).toThrow(/1 to 5/);
    expect(() => parseRating("3.5")).toThrow(/1 to 5/);
    expect(() => parseRating(null)).toThrow(/1 to 5/);
  });
});

describe("appraisalStatusLabel", () => {
  it("maps known statuses", () => {
    expect(appraisalStatusLabel("pending")).toBe("Pending manager");
    expect(appraisalStatusLabel("approved")).toBe("Completed");
  });
});
