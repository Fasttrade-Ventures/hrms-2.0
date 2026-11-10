import { describe, expect, it } from "vitest";

import { daysToHours, hoursToDays } from "./hours";

describe("daysToHours", () => {
  it("converts 1 day to 7.6 hours for an Australian day", () => {
    expect(daysToHours(1, 7.6)).toBe(7.6);
  });

  it("converts 2 days to 16 hours for a Malaysian 8 hour day", () => {
    expect(daysToHours(2, 8)).toBe(16);
  });

  it("returns 0 for 0 days", () => {
    expect(daysToHours(0, 7.6)).toBe(0);
  });

  it("rounds away floating point noise (3 x 7.6 = 22.8)", () => {
    expect(daysToHours(3, 7.6)).toBe(22.8);
  });

  it("throws when standardDayHours is 0", () => {
    expect(() => daysToHours(1, 0)).toThrow();
  });

  it("throws when standardDayHours is negative", () => {
    expect(() => daysToHours(1, -7.6)).toThrow();
  });
});

describe("hoursToDays", () => {
  it("converts 15.2 hours to 2 days at 7.6 hours a day", () => {
    expect(hoursToDays(15.2, 7.6)).toBe(2);
  });

  it("converts 7.6 hours to 1 day", () => {
    expect(hoursToDays(7.6, 7.6)).toBe(1);
  });

  it("converts 3.8 hours to half a day", () => {
    expect(hoursToDays(3.8, 7.6)).toBe(0.5);
  });

  it("returns 0 for 0 hours", () => {
    expect(hoursToDays(0, 7.6)).toBe(0);
  });

  it("throws when standardDayHours is 0", () => {
    expect(() => hoursToDays(8, 0)).toThrow();
  });

  it("throws when standardDayHours is negative", () => {
    expect(() => hoursToDays(8, -1)).toThrow();
  });

  it("round-trips with daysToHours", () => {
    expect(hoursToDays(daysToHours(4.5, 7.6), 7.6)).toBe(4.5);
  });
});
