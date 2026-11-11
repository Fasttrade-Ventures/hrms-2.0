import { describe, expect, it } from "vitest";

import { canMoveToStage, nextAdvanceStages } from "@/lib/recruitment/types";

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

  it("nextAdvanceStages never includes hired", () => {
    expect(nextAdvanceStages("assessment")).toEqual(["offer"]);
    expect(nextAdvanceStages("offer")).toEqual([]);
  });

  it("nextAdvanceStages from applied lists forward path without terminals", () => {
    expect(nextAdvanceStages("applied")).toEqual([
      "screening",
      "interview",
      "assessment",
      "offer",
    ]);
  });

  it("nextAdvanceStages from hired is empty", () => {
    expect(nextAdvanceStages("hired")).toEqual([]);
  });
});
