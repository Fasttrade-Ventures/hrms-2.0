import { describe, expect, it } from "vitest";

import {
  canAccessPortal,
  getPortalRolesForPath,
  isPublicAuthPath,
  isSafeInternalPath,
} from "../../apps/web/src/lib/auth/routes";

describe("auth route guards", () => {
  it("maps portal prefixes to roles", () => {
    expect(getPortalRolesForPath("/hr/employees")).toEqual(["hr_administrator"]);
    expect(getPortalRolesForPath("/employee/dashboard")).toEqual(["employee"]);
    expect(getPortalRolesForPath("/owner/dashboard")).toEqual(["organization_owner"]);
    expect(getPortalRolesForPath("/unknown")).toBeNull();
  });

  it("allows access when user has a matching role", () => {
    expect(canAccessPortal("/hr/employees", ["hr_administrator"])).toBe(true);
    expect(canAccessPortal("/hr/employees", ["organization_owner"])).toBe(false);
    expect(canAccessPortal("/owner/dashboard", ["organization_owner", "hr_administrator"])).toBe(
      true,
    );
  });

  it("blocks cross-portal access for bootstrap-style multi-role users", () => {
    const roles = ["hr_administrator", "organization_owner"];

    expect(canAccessPortal("/hr/dashboard", roles)).toBe(true);
    expect(canAccessPortal("/owner/dashboard", roles)).toBe(true);
    expect(canAccessPortal("/employee/dashboard", roles)).toBe(false);
    expect(canAccessPortal("/manager/dashboard", roles)).toBe(false);
  });

  it("treats only public auth paths as anonymous", () => {
    expect(isPublicAuthPath("/auth/login")).toBe(true);
    expect(isPublicAuthPath("/auth/callback")).toBe(true);
    expect(isPublicAuthPath("/auth/change-password")).toBe(false);
  });

  it("rejects unsafe redirect targets", () => {
    expect(isSafeInternalPath("/hr/dashboard")).toBe(true);
    expect(isSafeInternalPath("//evil.test")).toBe(false);
    expect(isSafeInternalPath("https://evil.test")).toBe(false);
  });
});
