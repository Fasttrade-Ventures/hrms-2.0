import { describe, expect, it } from "vitest";

import { computeTp1AnnualReliefs } from "./tp1-reliefs";

describe("computeTp1AnnualReliefs", () => {
  it("gives child relief only when married with working spouse", () => {
    const result = computeTp1AnnualReliefs({
      maritalStatus: "married",
      spouseWorking: true,
      childCount: 2,
    });
    expect(result.spouse.toNumber()).toBe(0);
    expect(result.children.toNumber()).toBe(4000);
  });

  it("includes spouse relief when spouse is not working", () => {
    const result = computeTp1AnnualReliefs({
      maritalStatus: "married",
      spouseWorking: false,
      childCount: 2,
    });
    expect(result.spouse.toNumber()).toBe(4000);
    expect(result.children.toNumber()).toBe(4000);
  });

  it("returns zero for single employees", () => {
    const result = computeTp1AnnualReliefs({
      maritalStatus: "single",
      spouseWorking: null,
      childCount: 2,
    });
    expect(result.spouse.toNumber()).toBe(0);
    expect(result.children.toNumber()).toBe(4000);
  });
});
