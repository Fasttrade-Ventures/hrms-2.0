import { describe, expect, it } from "vitest";

import {
  formatEmployeeNumber,
  getNextEmployeeNumberFromList,
  parseEmployeeNumberSequence,
} from "../../apps/web/src/lib/employees/generate-employee-number";
import { createEmployeeSchema } from "@hrms/validation";

describe("employee number generation", () => {
  it("formats sequential employee numbers", () => {
    expect(formatEmployeeNumber(1)).toBe("EMP-001");
    expect(formatEmployeeNumber(42)).toBe("EMP-042");
  });

  it("parses EMP numbers", () => {
    expect(parseEmployeeNumberSequence("EMP-010")).toBe(10);
    expect(parseEmployeeNumberSequence("ADMIN-001")).toBeNull();
  });

  it("picks the next EMP number from existing values", () => {
    expect(getNextEmployeeNumberFromList(["ADMIN-001", "EMP-002", "EMP-010"])).toBe("EMP-011");
    expect(getNextEmployeeNumberFromList(["ADMIN-001"])).toBe("EMP-001");
  });
});

describe("createEmployeeSchema", () => {
  it("accepts a valid create payload", () => {
    const parsed = createEmployeeSchema.parse({
      fullName: "Jane Doe",
      email: "jane@example.com",
      joinDate: "2026-07-23",
      sendActivationEmail: true,
    });

    expect(parsed.employeeNumber).toBeUndefined();
    expect(parsed.sendActivationEmail).toBe(true);
  });

  it("rejects invalid email", () => {
    expect(() =>
      createEmployeeSchema.parse({
        fullName: "Jane Doe",
        email: "not-an-email",
        joinDate: "2026-07-23",
      }),
    ).toThrow();
  });
});
