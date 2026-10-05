import { describe, expect, it } from "vitest";

import {
  employeesMissingAcknowledgement,
  needsAcknowledgement,
} from "@/lib/policies/acknowledgements";

describe("policy acknowledgement", () => {
  it("asks again when the published version is newer than the one the employee signed", () => {
    expect(
      needsAcknowledgement({
        policyId: "pol-1",
        policyVersion: 2,
        acknowledgedVersion: 1,
      }),
    ).toBe(true);
    expect(
      needsAcknowledgement({
        policyId: "pol-1",
        policyVersion: 2,
        acknowledgedVersion: 2,
      }),
    ).toBe(false);
    expect(
      needsAcknowledgement({
        policyId: "pol-1",
        policyVersion: 1,
        acknowledgedVersion: null,
      }),
    ).toBe(true);
  });

  it("lists only active employees who have not acknowledged the current version", () => {
    const missing = employeesMissingAcknowledgement(
      [
        { id: "a", status: "active", name: "Aina" },
        { id: "b", status: "active", name: "Ben" },
        { id: "c", status: "terminated", name: "Cara" },
      ],
      [
        { employeeId: "a", version: 1 },
        { employeeId: "b", version: 2 },
      ],
      2,
    );

    expect(missing.map((row) => row.id)).toEqual(["a"]);
  });
});
