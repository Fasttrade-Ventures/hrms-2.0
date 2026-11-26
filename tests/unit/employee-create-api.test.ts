import { describe, expect, it } from "vitest";

import { hasApiScope } from "../../apps/web/src/lib/api/auth";
import {
  EMPLOYEE_API_FIELDS,
  EmployeeApiValidationError,
  createEmployeeFromApi,
  employeeApiErrorStatus,
} from "../../apps/web/src/lib/api/employee-create";

describe("create employee API", () => {
  it("needs the employees:write scope, not just read", () => {
    expect(hasApiScope(["employees:write"], "employees:write")).toBe(true);
    expect(hasApiScope(["employees:read"], "employees:write")).toBe(false);
    expect(hasApiScope(["staff:self", "attendance:clock"], "employees:write")).toBe(false);
  });

  it("rejects a missing required field before touching the database", async () => {
    await expect(
      createEmployeeFromApi("org-1", { fullName: "Aina Sofea", email: "aina@example.com" }),
    ).rejects.toBeInstanceOf(EmployeeApiValidationError);
  });

  it("refuses fields that would widen access", async () => {
    const base = { fullName: "A", email: "a@example.com", joinDate: "2026-12-01" };
    for (const field of ["portalRole", "managerEmployeeId", "branchId", "departmentId", "allowedLeaveTypeIds"]) {
      await expect(createEmployeeFromApi("org-1", { ...base, [field]: "x" })).rejects.toThrow(
        new RegExp(`${field}: not accepted`),
      );
    }
  });

  it("never lists the access-widening fields as allowed", () => {
    for (const field of ["portalRole", "managerEmployeeId", "branchId", "departmentId", "shiftId", "payGroupId", "positionId"]) {
      expect(EMPLOYEE_API_FIELDS).not.toContain(field);
    }
  });

  it("rejects a bad join date and a bad email", async () => {
    await expect(
      createEmployeeFromApi("org-1", { fullName: "A", email: "a@example.com", joinDate: "TBD" }),
    ).rejects.toThrow(/joinDate/);
    await expect(
      createEmployeeFromApi("org-1", { fullName: "A", email: "not-an-email", joinDate: "2026-12-01" }),
    ).rejects.toThrow(/email/);
  });

  it("maps failures to HTTP statuses", () => {
    expect(employeeApiErrorStatus(new EmployeeApiValidationError("joinDate: bad"))).toBe(400);
    expect(
      employeeApiErrorStatus(new Error("An employee with this email or employee number already exists.")),
    ).toBe(409);
    expect(employeeApiErrorStatus(new Error("This organization is licensed for 10 active employees."))).toBe(403);
    expect(employeeApiErrorStatus(new Error("Subscription inactive."))).toBe(403);
    expect(employeeApiErrorStatus(new Error("boom"))).toBe(500);
  });
});
