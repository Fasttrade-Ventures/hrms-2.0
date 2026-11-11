import { describe, expect, it } from "vitest";
import { canTransitionRequisitionStatus } from "@/lib/recruitment/requisition-status";

describe("canTransitionRequisitionStatus", () => {
  it("allows open → on_hold, open → closed, on_hold → closed, closed → open, on_hold → open", () => {
    expect(canTransitionRequisitionStatus("open", "on_hold")).toBe(true);
    expect(canTransitionRequisitionStatus("open", "closed")).toBe(true);
    expect(canTransitionRequisitionStatus("on_hold", "closed")).toBe(true);
    expect(canTransitionRequisitionStatus("closed", "open")).toBe(true);
    expect(canTransitionRequisitionStatus("on_hold", "open")).toBe(true);
  });
  it("blocks closed → on_hold and same-status no-ops as false", () => {
    expect(canTransitionRequisitionStatus("closed", "on_hold")).toBe(false);
    expect(canTransitionRequisitionStatus("open", "open")).toBe(false);
  });
});
