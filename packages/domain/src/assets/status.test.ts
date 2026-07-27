import { describe, expect, it } from "vitest";

import { assertAssetStatusTransition, nextAssetStatusAfterReturn } from "./status";

describe("assertAssetStatusTransition", () => {
  it("allows assign from available", () => {
    expect(() =>
      assertAssetStatusTransition("available", "assigned", "assign"),
    ).not.toThrow();
  });

  it("blocks assign from disposed", () => {
    expect(() =>
      assertAssetStatusTransition("disposed", "assigned", "assign"),
    ).toThrow(/cannot assign/i);
  });
});

describe("nextAssetStatusAfterReturn", () => {
  it("returns available when return to inventory", () => {
    expect(nextAssetStatusAfterReturn("to_inventory")).toBe("available");
  });

  it("returns returned when pending inspection", () => {
    expect(nextAssetStatusAfterReturn("pending_inspection")).toBe("returned");
  });
});
