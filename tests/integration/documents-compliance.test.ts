import { describe, expect, it } from "vitest";

import {
  documentTypesMatch,
  employeeDocumentUploadDecision,
  resolveDocumentCompliance,
} from "../../apps/web/src/lib/hr/document-compliance";

describe("resolveDocumentCompliance", () => {
  const required = { requiresExpiry: true, warningDays: 30 };
  const today = "2026-07-24";

  it("returns missing when no document", () => {
    expect(resolveDocumentCompliance({ required, document: null, today })).toBe("missing");
  });

  it("returns expired when past expiry", () => {
    expect(
      resolveDocumentCompliance({
        required,
        document: { expiresAt: "2026-07-01" },
        today,
      }),
    ).toBe("expired");
  });

  it("returns expiring within warning window", () => {
    expect(
      resolveDocumentCompliance({
        required,
        document: { expiresAt: "2026-08-01" },
        today,
      }),
    ).toBe("expiring");
  });

  it("returns valid when expiry is far out", () => {
    expect(
      resolveDocumentCompliance({
        required,
        document: { expiresAt: "2027-01-01" },
        today,
      }),
    ).toBe("valid");
  });

  it("returns valid when expiry not required and doc exists", () => {
    expect(
      resolveDocumentCompliance({
        required: { requiresExpiry: false, warningDays: 30 },
        document: { expiresAt: null },
        today,
      }),
    ).toBe("valid");
  });
});

describe("documentTypesMatch", () => {
  it("matches case-insensitively", () => {
    expect(documentTypesMatch("NRIC Copy", "nric copy")).toBe(true);
  });
});

describe("employeeDocumentUploadDecision", () => {
  const required = { requiresExpiry: true, warningDays: 30 };
  const today = "2026-07-24";

  it("allows insert when no existing document", () => {
    expect(employeeDocumentUploadDecision({ existing: null, required, today })).toBe("insert");
  });

  it("denies when a valid document already exists", () => {
    expect(
      employeeDocumentUploadDecision({
        existing: { expiresAt: "2027-01-01" },
        required,
        today,
      }),
    ).toBe("deny");
  });

});

describe("rolesCanAccessFolder", () => {
  it("allows hr administrators regardless of folder roles", async () => {
    const { rolesCanAccessFolder } = await import(
      "../../apps/web/src/lib/hr/document-folder-access"
    );
    expect(rolesCanAccessFolder(["employee"], ["hr_administrator"])).toBe(true);
  });

  it("allows matching portal roles", async () => {
    const { rolesCanAccessFolder } = await import(
      "../../apps/web/src/lib/hr/document-folder-access"
    );
    expect(rolesCanAccessFolder(["employee", "manager"], ["employee"])).toBe(true);
    expect(rolesCanAccessFolder(["hr_administrator"], ["employee"])).toBe(false);
  });

  it("allows access when folder has no role restrictions", async () => {
    const { rolesCanAccessFolder } = await import(
      "../../apps/web/src/lib/hr/document-folder-access"
    );
    expect(rolesCanAccessFolder(null, ["employee"])).toBe(true);
    expect(rolesCanAccessFolder([], ["manager"])).toBe(true);
  });
});
