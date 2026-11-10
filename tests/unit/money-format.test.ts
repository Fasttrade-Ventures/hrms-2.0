import { describe, expect, it } from "vitest";

import { formatMoney } from "@/lib/money";

describe("formatMoney", () => {
  it("formats MYR with the RM prefix", () => {
    expect(formatMoney(10, "MYR")).toBe("RM 10.00");
  });

  it("formats AUD with the A$ prefix", () => {
    expect(formatMoney(10, "AUD")).toBe("A$10.00");
  });

  it("groups thousands for both currencies", () => {
    expect(formatMoney(1234.5, "MYR")).toBe("RM 1,234.50");
    expect(formatMoney(1234.5, "AUD")).toBe("A$1,234.50");
  });
});
