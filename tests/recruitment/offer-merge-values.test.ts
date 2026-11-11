import { describe, expect, it } from "vitest";

import { buildOfferMergeValues, formatEmploymentTypeLabel } from "@/lib/recruitment/offers";

describe("buildOfferMergeValues", () => {
  it("includes requisition, offer date, and company contact tags", () => {
    const values = buildOfferMergeValues({
      candidateName: "Aisyah Rahman",
      candidateEmail: "aisyah@example.com",
      jobTitle: "Senior Accountant",
      basicSalary: 4500,
      currencyCode: "MYR",
      startDate: "2027-01-04",
      organizationName: "Acme Sdn Bhd",
      requisitionTitle: "Senior Accountant (Finance)",
      offerDate: "11 November 2026",
      department: "Finance",
      employmentType: "full_time",
      workLocation: "KL HQ",
      companyEmail: "hr@acme.test",
      companyPhone: "+60 3 1234 5678",
    });

    expect(values).toMatchObject({
      offer_date: "11 November 2026",
      department: "Finance",
      employment_type: "Full time",
      work_location: "KL HQ",
      company_email: "hr@acme.test",
      company_phone: "+60 3 1234 5678",
    });
  });

  it("formats known employment types and passes through custom values", () => {
    expect(formatEmploymentTypeLabel("full_time")).toBe("Full time");
    expect(formatEmploymentTypeLabel("part_time")).toBe("Part time");
    expect(formatEmploymentTypeLabel("contract")).toBe("Contract");
    expect(formatEmploymentTypeLabel("intern")).toBe("Intern");
    expect(formatEmploymentTypeLabel("Seasonal")).toBe("Seasonal");
    expect(formatEmploymentTypeLabel(null)).toBe("");
  });
});
