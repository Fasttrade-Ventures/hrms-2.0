import { describe, expect, it } from "vitest";

import { createBranchSchema, organizationCompanySettingsSchema } from "./organization";

describe("createBranchSchema state by country", () => {
  it("accepts a Malaysian state when country is omitted", () => {
    const result = createBranchSchema.safeParse({ name: "HQ", state: "Selangor" });
    expect(result.success).toBe(true);
  });

  it("rejects an Australian state for a Malaysian organization", () => {
    expect(createBranchSchema.safeParse({ name: "HQ", country: "MY", state: "NSW" }).success).toBe(
      false,
    );
  });

  it("accepts every Australian state and territory for AU", () => {
    for (const state of ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"]) {
      expect(createBranchSchema.safeParse({ name: "HQ", country: "AU", state }).success).toBe(true);
    }
  });

  it("rejects a Malaysian state for an Australian organization", () => {
    expect(
      createBranchSchema.safeParse({ name: "HQ", country: "AU", state: "Selangor" }).success,
    ).toBe(false);
  });

  it("treats an empty state as not set", () => {
    const result = createBranchSchema.safeParse({ name: "HQ", country: "AU", state: "" });
    expect(result.success && result.data.state).toBe(null);
  });
});

describe("organizationCompanySettingsSchema", () => {
  it("derives AUD, 7.6 hour day and ABN for AU", () => {
    const result = organizationCompanySettingsSchema.parse({
      country: "AU",
      abn: "12 345 678 901",
      state: "VIC",
    });
    expect(result).toEqual({
      country: "AU",
      currency: "AUD",
      abn: "12345678901",
      state: "VIC",
      standardDayHours: 7.6,
    });
  });

  it("rejects an ABN that is not 11 digits", () => {
    for (const abn of ["", "1234567890", "123456789012", "1234567890a"]) {
      expect(
        organizationCompanySettingsSchema.safeParse({ country: "AU", abn, state: "NSW" }).success,
      ).toBe(false);
    }
  });

  it("requires an Australian state for AU", () => {
    expect(
      organizationCompanySettingsSchema.safeParse({ country: "AU", abn: "12345678901", state: "" })
        .success,
    ).toBe(false);
  });

  it("keeps MY on MYR, 8 hour day, no ABN", () => {
    const result = organizationCompanySettingsSchema.parse({
      country: "MY",
      abn: "12345678901",
      state: "Johor",
    });
    expect(result.currency).toBe("MYR");
    expect(result.standardDayHours).toBe(8);
    expect(result.abn).toBe(null);
  });
});
