import { describe, expect, it } from "vitest";

import { canTransition, transition } from "@hrms/domain";

describe("approval state machine", () => {
  it("submits draft to pending", () => {
    expect(canTransition("draft", "submit")).toBe(true);
    expect(transition("draft", "submit")).toBe("pending");
  });

  it("rejects invalid transition", () => {
    expect(canTransition("approved", "submit")).toBe(false);
    expect(() => transition("approved", "submit")).toThrow();
  });
});
