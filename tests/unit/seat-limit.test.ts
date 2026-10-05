import { describe, expect, it } from "vitest";

import { seatLimitMessage } from "@/lib/employees/seat-limit";

describe("seat limit", () => {
  it("allows any headcount when the license is unlimited", () => {
    expect(seatLimitMessage(80, null)).toBeNull();
  });

  it("blocks the next active employee when the licensed number is already filled", () => {
    expect(seatLimitMessage(50, 50)).toBe("This organization is licensed for 50 active employees.");
    expect(seatLimitMessage(49, 50)).toBeNull();
  });
});
