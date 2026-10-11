import { describe, expect, it } from "vitest";

import { parseAttendanceTarget } from "../../apps/web/src/lib/api/attendance";
import { hasApiScope } from "../../apps/web/src/lib/api/auth";
import { staffApiErrorStatus } from "../../apps/web/src/lib/api/staff-requests";

describe("attendance API", () => {
  it("requires an employee number or email", () => {
    expect(parseAttendanceTarget({ employeeNumber: " E001 " })).toEqual({
      employeeNumber: "E001",
      email: undefined,
    });
    expect(parseAttendanceTarget({ email: " Staff@Example.com " })).toEqual({
      employeeNumber: undefined,
      email: "staff@example.com",
    });
    expect(() => parseAttendanceTarget({})).toThrow(/required/);
  });

  it("allows clock-in only when the key has the attendance scope", () => {
    expect(hasApiScope(["attendance:clock"], "attendance:clock")).toBe(true);
    expect(hasApiScope(["employees:read"], "attendance:clock")).toBe(false);
    expect(hasApiScope(["staff:self"], "attendance:clock")).toBe(true);
    expect(hasApiScope(["staff:self"], "staff:self")).toBe(true);
    expect(hasApiScope(["attendance:clock"], "staff:self")).toBe(false);
  });

  it("maps staff request failures to HTTP statuses", () => {
    expect(staffApiErrorStatus("Active employee not found.")).toBe(404);
    expect(staffApiErrorStatus("Only a pending leave request can be cancelled.")).toBe(409);
    expect(staffApiErrorStatus("claims is not enabled for this organization.")).toBe(403);
    expect(staffApiErrorStatus("hours must be greater than 0 and no more than 24.")).toBe(400);
  });
});
