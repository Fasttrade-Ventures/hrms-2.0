import { describe, expect, it } from "vitest";

import { canMoveToStage } from "@/lib/recruitment/types";

describe("recruitment stages", () => {
  it("allows forward stage moves", () => {
    expect(canMoveToStage("applied", "screening")).toBe(true);
    expect(canMoveToStage("offer", "hired")).toBe(true);
  });

  it("blocks backward moves", () => {
    expect(canMoveToStage("interview", "applied")).toBe(false);
  });

  it("blocks moves from terminal stages", () => {
    expect(canMoveToStage("hired", "offer")).toBe(false);
  });
});
