import { describe, expect, it } from "vitest";

import { orgTimezoneForCountry, timezoneForAustralianState } from "@/lib/datetime/org-timezone";

describe("Australian state timezones", () => {
  it.each([
    ["NSW", "Australia/Sydney"],
    ["ACT", "Australia/Sydney"],
    ["VIC", "Australia/Melbourne"],
    ["QLD", "Australia/Brisbane"],
    ["SA", "Australia/Adelaide"],
    ["WA", "Australia/Perth"],
    ["TAS", "Australia/Hobart"],
    ["NT", "Australia/Darwin"],
  ])("%s uses %s", (state, zone) => {
    expect(timezoneForAustralianState(state)).toBe(zone);
    expect(orgTimezoneForCountry("AU", state)).toBe(zone);
  });

  it("keeps Kuala Lumpur for Malaysian organizations", () => {
    expect(orgTimezoneForCountry("MY", "Selangor")).toBe("Asia/Kuala_Lumpur");
    expect(orgTimezoneForCountry("MY", null)).toBe("Asia/Kuala_Lumpur");
  });
});
