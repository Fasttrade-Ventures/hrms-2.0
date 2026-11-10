import { describe, expect, it } from "vitest";

import { assertMalaysianCountry, MALAYSIAN_ONLY_EXPORT_MESSAGE } from "@/lib/payroll/exports/country-guard";
import { getPortalNavSectionsForEntitlements } from "@/lib/portal-nav";

function hrefs(country: "MY" | "AU"): string[] {
  const sections = getPortalNavSectionsForEntitlements("HR Administrator", {
    hasModule: () => true,
    tier: "enterprise",
    country,
  });
  return sections.flatMap((section) =>
    section.items.flatMap((item) => [item.href, ...(item.children ?? []).map((child) => child.href)]),
  );
}

describe("Malaysian exports for Australian organizations", () => {
  it("refuses EPF, SOCSO, PCB, HRDF, CP8D and EA exports when the country is AU", () => {
    expect(() => assertMalaysianCountry("AU")).toThrow(MALAYSIAN_ONLY_EXPORT_MESSAGE);
  });

  it("lets a Malaysian organization keep those exports", () => {
    expect(() => assertMalaysianCountry("MY")).not.toThrow();
  });

  it("hides Year-end and Statutory rules from the HR menu when the country is AU", () => {
    const au = hrefs("AU");
    expect(au).not.toContain("/hr/payroll/year-end");
    expect(au).not.toContain("/hr/organization/statutory-rules");
    expect(au).toContain("/hr/payroll");
    expect(au).toContain("/hr/organization/pay-groups");
  });

  it("keeps Year-end and Statutory rules for Malaysia", () => {
    const my = hrefs("MY");
    expect(my).toContain("/hr/payroll/year-end");
    expect(my).toContain("/hr/organization/statutory-rules");
  });
});
