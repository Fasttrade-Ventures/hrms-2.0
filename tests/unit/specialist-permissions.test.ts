import { describe, expect, it } from "vitest";

import { canAccessPath } from "../../apps/web/src/lib/auth/routes";

describe("specialist permissions", () => {
  it("lets a recruiter open recruitment without HR administrator", () => {
    expect(canAccessPath("/hr/recruitment", ["employee"], ["recruiter"])).toBe(true);
    expect(canAccessPath("/hr/recruitment/req-1", ["employee"], ["recruiter"])).toBe(true);
    expect(canAccessPath("/hr/employees", ["employee"], ["recruiter"])).toBe(false);
    expect(canAccessPath("/hr/documents", ["employee"], ["recruiter"])).toBe(false);
  });

  it("lets a document custodian open documents only", () => {
    expect(canAccessPath("/hr/documents", ["employee"], ["document_custodian"])).toBe(true);
    expect(canAccessPath("/hr/documents/library", ["employee"], ["document_custodian"])).toBe(true);
    expect(canAccessPath("/hr/assets", ["employee"], ["document_custodian"])).toBe(false);
  });

  it("lets an asset manager open assets only", () => {
    expect(canAccessPath("/hr/assets", ["employee"], ["asset_manager"])).toBe(true);
    expect(canAccessPath("/hr/assets/asset-1", ["employee"], ["asset_manager"])).toBe(true);
    expect(canAccessPath("/hr/payroll", ["employee"], ["asset_manager"])).toBe(false);
  });

  it("still lets HR open the whole HR portal", () => {
    expect(canAccessPath("/hr/employees", ["hr_administrator"], [])).toBe(true);
  });
});
