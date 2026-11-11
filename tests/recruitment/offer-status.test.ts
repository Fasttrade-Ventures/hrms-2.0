import { describe, expect, it } from "vitest";
import {
  canEditAgreementBody,
  canEditOfferLetter,
  canSendAgreement,
  canTransitionOfferStatus,
  summarizeOfferFlow,
} from "@/lib/recruitment/offer-status";

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

describe("letter edit / send guards", () => {
  it("allows offer letter edits only in draft", () => {
    expect(canEditOfferLetter({ status: "draft" })).toBe(true);
    expect(canEditOfferLetter({ status: "sent" })).toBe(false);
    expect(canEditOfferLetter({ status: "accepted" })).toBe(false);
  });

  it("allows agreement body edits after accept before send", () => {
    expect(
      canEditAgreementBody({ status: "accepted", agreement_sent_at: null, signed_file_id: null }),
    ).toBe(true);
    expect(
      canEditAgreementBody({
        status: "accepted",
        agreement_sent_at: "2026-11-11T00:00:00Z",
        signed_file_id: null,
      }),
    ).toBe(false);
    expect(
      canEditAgreementBody({ status: "sent", agreement_sent_at: null, signed_file_id: null }),
    ).toBe(false);
  });

  it("allows sending agreement while accepted and unsigned", () => {
    expect(canSendAgreement({ status: "accepted", signed_file_id: null })).toBe(true);
    expect(canSendAgreement({ status: "accepted", signed_file_id: "file" })).toBe(false);
  });

  it("summarizes prepare-agreement vs awaiting-signature", () => {
    expect(
      summarizeOfferFlow({
        status: "accepted",
        agreementFileId: null,
        agreementSentAt: null,
        signedFileId: null,
        applicationStage: "offer",
      }).headline,
    ).toBe("Prepare agreement");
    expect(
      summarizeOfferFlow({
        status: "accepted",
        agreementFileId: "file",
        agreementSentAt: "2026-11-11T00:00:00Z",
        signedFileId: null,
        applicationStage: "offer",
      }).headline,
    ).toBe("Awaiting signature");
  });
});
