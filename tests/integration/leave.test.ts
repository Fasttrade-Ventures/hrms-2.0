import { describe, expect, it } from "vitest";

import { countWorkingDays } from "@hrms/domain";

describe("leave working days", () => {
  it("counts weekdays between two dates", () => {
    const days = countWorkingDays(new Date("2026-07-20"), new Date("2026-07-24"), {
      weekendMode: "sat_sun",
    });

    expect(days).toBe(5);
  });

  it("applies half-day reduction", () => {
    const days = countWorkingDays(new Date("2026-07-23"), new Date("2026-07-23"), {
      weekendMode: "sat_sun",
      halfDay: true,
    });

    expect(days).toBe(0.5);
  });
});
