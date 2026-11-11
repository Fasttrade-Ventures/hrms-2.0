import { describe, expect, it } from "vitest";
import { buildOfferPdfLines } from "@/lib/recruitment/offer-pdf";

describe("buildOfferPdfLines", () => {
  it("labels salary with currency code", () => {
    const lines = buildOfferPdfLines({
      organizationName: "Acme",
      candidateName: "Ada",
      jobTitle: "Engineer",
      basicSalary: 1000,
      startDate: "2026-12-01",
      currencyCode: "AUD",
    });
    expect(lines.some((l) => l.includes("AUD") && l.includes("1000.00"))).toBe(true);
    expect(lines.some((l) => l.includes("(RM)"))).toBe(false);
  });
});
