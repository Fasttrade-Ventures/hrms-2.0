import { describe, expect, it } from "vitest";
import { canAcceptOfferStatus } from "@/lib/recruitment/offer-status";

describe("canAcceptOfferStatus", () => {
  it("allows draft and sent", () => {
    expect(canAcceptOfferStatus("draft")).toBe(true);
    expect(canAcceptOfferStatus("sent")).toBe(true);
  });

  it("blocks terminal and other statuses", () => {
    expect(canAcceptOfferStatus("accepted")).toBe(false);
    expect(canAcceptOfferStatus("declined")).toBe(false);
    expect(canAcceptOfferStatus("withdrawn")).toBe(false);
    expect(canAcceptOfferStatus("unknown")).toBe(false);
  });
});
