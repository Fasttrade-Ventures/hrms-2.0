import { describe, expect, it } from "vitest";

import { parseAttendanceTarget } from "../../apps/web/src/lib/api/attendance";
import { hasApiScope } from "../../apps/web/src/lib/api/auth";

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
  });
});
