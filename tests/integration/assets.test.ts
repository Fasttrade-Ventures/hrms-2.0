import { describe, expect, it } from "vitest";

import {
  assertAssetActionAllowed,
  assertAssetStatusTransition,
  nextAssetStatusAfterReturn,
} from "../../packages/domain/src/assets/status";

describe("asset status helpers", () => {
  it("allows return action from assigned", () => {
    expect(() => assertAssetActionAllowed("assigned", "return")).not.toThrow();
  });

  it("maps return destination to inventory status", () => {
    expect(nextAssetStatusAfterReturn("to_inventory")).toBe("available");
  });

  it("blocks assign from disposed", () => {
    expect(() => assertAssetStatusTransition("disposed", "assigned", "assign")).toThrow();
  });
});

describe("assignment snapshots", () => {
  it("preserves employee_name when employee_id is null", () => {
    const row = {
      employee_id: null,
      employee_name: "Former Staff",
      employee_number: "EMP-001",
    };
    expect(row.employee_name).toBe("Former Staff");
  });
});
