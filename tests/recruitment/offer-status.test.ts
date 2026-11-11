import { describe, expect, it } from "vitest";
import { canTransitionOfferStatus } from "@/lib/recruitment/offer-status";

describe("canTransitionOfferStatus", () => {
  it("allows draft|sent → sent|declined|withdrawn as defined", () => {
    expect(canTransitionOfferStatus("draft", "sent")).toBe(true);
    expect(canTransitionOfferStatus("draft", "declined")).toBe(true);
    expect(canTransitionOfferStatus("sent", "declined")).toBe(true);
    expect(canTransitionOfferStatus("draft", "withdrawn")).toBe(true);
  });
  it("blocks transitions from accepted/declined/withdrawn", () => {
    expect(canTransitionOfferStatus("accepted", "sent")).toBe(false);
    expect(canTransitionOfferStatus("declined", "sent")).toBe(false);
    expect(canTransitionOfferStatus("withdrawn", "sent")).toBe(false);
  });

  it("allows sent → withdrawn", () => {
    expect(canTransitionOfferStatus("sent", "withdrawn")).toBe(true);
  });

  it("rejects same-status transitions", () => {
    expect(canTransitionOfferStatus("sent", "sent")).toBe(false);
  });
});
