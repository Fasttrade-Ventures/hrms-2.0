import { describe, expect, it } from "vitest";

import { filterPortalNavSections, getPortalNavSections, moduleForNavHref } from "@/lib/portal-nav";

function labelsFor(portal: string, enabled: Set<string>): string[] {
  const sections = filterPortalNavSections(getPortalNavSections(portal), {
    hasModule: (module) => enabled.has(module),
    tier: "enterprise",
  });
  return sections.flatMap((section) =>
    section.items.flatMap((item) => [item.label, ...(item.children ?? []).map((child) => child.label)]),
  );
}

describe("disabled modules stay out of navigation", () => {
  it("hides announcements for HR and the owner when the feature is off", () => {
    const enabled = new Set(["calendar", "documents", "analytics", "payroll", "audit"]);

    expect(labelsFor("HR Administrator", enabled)).not.toContain("Announcements");
    expect(labelsFor("Organization Owner", enabled)).not.toContain("Announcements");
    expect(moduleForNavHref("/hr/announcements")).toBe("announcements");
  });

  it("hides analytics from the owner menu when that feature is off", () => {
    const enabled = new Set(["announcements"]);

    expect(labelsFor("Organization Owner", enabled)).not.toContain("Analytics");
    expect(labelsFor("Organization Owner", enabled)).toContain("Module settings");
  });
});
