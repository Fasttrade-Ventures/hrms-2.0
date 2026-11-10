import { describe, expect, it } from "vitest";

import { auEmployeeSchema, createEmployeeSchema } from "@hrms/validation";

import { parseEmployeeProfileFormData } from "@/lib/employees/parse-profile-form";

const validAu = {
  employmentBasis: "part_time",
  hourlyRate: "32.50",
  taxNumber: "123456782",
  bsb: "062000",
  bankAccountNumber: "12345678",
  superFundName: "AustralianSuper",
  superUsi: "STA0100AU",
  superMemberNumber: "A1234567",
  taxFreeThreshold: true,
  studyLoan: false,
};

function auForm(overrides: Record<string, string | null> = {}): FormData {
  const base: Record<string, string> = {
    fullName: "Jamie Nguyen",
    email: "jamie@example.com.au",
    joinDate: "2026-11-01",
    employmentBasis: "casual",
    hourlyRate: "30.00",
    taxNumber: "12345678",
    bsb: "062000",
    bankAccountNumber: "12345678",
    superFundName: "Hostplus",
    superUsi: "HOS0100AU",
    superMemberNumber: "M99",
  };
  const form = new FormData();
  for (const [key, value] of Object.entries({ ...base, ...overrides })) {
    if (value !== null) form.set(key, value);
  }
  return form;
}

describe("auEmployeeSchema", () => {
  it("accepts a valid Australian payload", () => {
    const parsed = auEmployeeSchema.safeParse(validAu);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.hourlyRate).toBe(32.5);
  });

  it("rejects a 7-digit TFN", () => {
    expect(auEmployeeSchema.safeParse({ ...validAu, taxNumber: "1234567" }).success).toBe(false);
  });

  it("rejects a 5-digit BSB", () => {
    expect(auEmployeeSchema.safeParse({ ...validAu, bsb: "06200" }).success).toBe(false);
  });

  it("rejects a missing employment basis", () => {
    const { employmentBasis: _omit, ...rest } = validAu;
    expect(auEmployeeSchema.safeParse(rest).success).toBe(false);
  });
});

describe("Malaysian employee payload", () => {
  it("passes without the Australian fields", () => {
    const parsed = createEmployeeSchema.safeParse({
      fullName: "Aisyah Rahman",
      email: "aisyah@example.com",
      joinDate: "2026-11-01",
    });
    expect(parsed.success).toBe(true);
  });
});

describe("parseEmployeeProfileFormData for Australia", () => {
  it("treats unchecked tax-free threshold and study loan as false", () => {
    const parsed = parseEmployeeProfileFormData(auForm(), "AU");
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.taxFreeThreshold).toBe(false);
      expect(parsed.data.studyLoan).toBe(false);
      expect(parsed.data.employmentBasis).toBe("casual");
      expect(parsed.data.hourlyRate).toBe(30);
    }
  });

  it("reads checked boxes as true", () => {
    const form = auForm();
    form.set("taxFreeThreshold", "on");
    form.set("studyLoan", "on");
    const parsed = parseEmployeeProfileFormData(form, "AU");
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.taxFreeThreshold).toBe(true);
      expect(parsed.data.studyLoan).toBe(true);
    }
  });

  it("rejects a bad TFN on save", () => {
    const parsed = parseEmployeeProfileFormData(auForm({ taxNumber: "1234567" }), "AU");
    expect(parsed.success).toBe(false);
  });

  it("does not require the Australian fields for a Malaysian organization", () => {
    const form = new FormData();
    form.set("fullName", "Aisyah Rahman");
    form.set("email", "aisyah@example.com");
    form.set("joinDate", "2026-11-01");
    expect(parseEmployeeProfileFormData(form, "MY").success).toBe(true);
    expect(parseEmployeeProfileFormData(form).success).toBe(true);
  });
});
