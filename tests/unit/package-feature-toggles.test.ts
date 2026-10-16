import { describe, expect, it } from "vitest";

import { createDbEntitlementProvider, tierIncludesModule } from "@hrms/platform";

describe("package feature toggles", () => {
  it("lets the high package turn off lower, middle, and high features", () => {
    const entitlements = createDbEntitlementProvider({
      tier: "enterprise",
      modules: {
        announcements: false,
        payroll: false,
        recruitment: false,
      },
    });

    expect(entitlements.hasModule("announcements")).toBe(false);
    expect(entitlements.hasModule("payroll")).toBe(false);
    expect(entitlements.hasModule("recruitment")).toBe(false);
    expect(entitlements.hasModule("calendar")).toBe(true);
  });

  it("keeps higher features off for a lower package even if a flag tries to enable them", () => {
    const entitlements = createDbEntitlementProvider({
      tier: "core",
      modules: {
        documents: false,
        payroll: true,
        recruitment: true,
      },
    });

    expect(entitlements.hasModule("documents")).toBe(false);
    expect(entitlements.hasModule("payroll")).toBe(false);
    expect(entitlements.hasModule("recruitment")).toBe(false);
    expect(tierIncludesModule("core", "announcements")).toBe(true);
    expect(tierIncludesModule("professional", "payroll")).toBe(true);
    expect(tierIncludesModule("professional", "recruitment")).toBe(false);
    expect(tierIncludesModule("enterprise", "recruitment")).toBe(true);
  });
});
