import { describe, expect, it } from "vitest";

import { slugifyOrganizationName } from "@/lib/platform/provision-tenant";

describe("slugifyOrganizationName", () => {
  it("normalizes company names into URL slugs", () => {
    expect(slugifyOrganizationName("Acme Sdn Bhd")).toBe("acme-sdn-bhd");
    expect(slugifyOrganizationName("  Hello   World!  ")).toBe("hello-world");
  });
});
