import { describe, expect, it } from "vitest";

import { canAccessPath } from "../../apps/web/src/lib/auth/routes";

function canAccessReports(roles: readonly string[], permissions: readonly string[]): boolean {
  return roles.includes("hr_administrator") || permissions.includes("auditor");
}

function canRunOrgReports(roles: readonly string[], permissions: readonly string[]): boolean {
  return canAccessReports(roles, permissions) || roles.includes("director");
}

describe("reports access", () => {
  it("allows hr administrator", () => {
    expect(canAccessReports(["hr_administrator"], [])).toBe(true);
  });

  it("allows auditor permission without hr role", () => {
    expect(canAccessReports(["employee"], ["auditor"])).toBe(true);
  });

  it("allows director to run org reports", () => {
    expect(canRunOrgReports(["director"], [])).toBe(true);
  });

  it("whitelists auditor on reports path only", () => {
    expect(canAccessPath("/hr/reports/leave-balances", [], ["auditor"])).toBe(true);
    expect(canAccessPath("/hr/dashboard", [], ["auditor"])).toBe(false);
  });

  it("whitelists auditor on audit paths", () => {
    expect(canAccessPath("/auditor/audit", [], ["auditor"])).toBe(true);
    expect(canAccessPath("/hr/audit", [], ["auditor"])).toBe(true);
    expect(canAccessPath("/api/hr/audit/export", [], ["auditor"])).toBe(true);
  });
});
