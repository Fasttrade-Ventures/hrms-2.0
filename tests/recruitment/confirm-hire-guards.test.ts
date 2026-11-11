import { describe, expect, it } from "vitest";

import {
  assertCanConfirmHire,
  canCandidateRespondOfferStatus,
  canConfirmHire,
  summarizeOfferFlow,
} from "@/lib/recruitment/offer-status";

describe("candidate response gate", () => {
  it("only allows responses while the offer is sent", () => {
    expect(canCandidateRespondOfferStatus("sent")).toBe(true);
    for (const status of ["draft", "accepted", "declined", "withdrawn"]) {
      expect(canCandidateRespondOfferStatus(status)).toBe(false);
    }
  });
});

describe("assertCanConfirmHire", () => {
  it("throws when the signed file is missing", () => {
    expect(() => assertCanConfirmHire({ status: "accepted", signed_file_id: null })).toThrow(/signed agreement/i);
    expect(canConfirmHire({ status: "accepted", signed_file_id: null })).toBe(false);
  });

  it("throws when the offer is not accepted", () => {
    expect(() => assertCanConfirmHire({ status: "sent", signed_file_id: "f1" })).toThrow(/accept/i);
    expect(() => assertCanConfirmHire({ status: "draft", signed_file_id: "f1" })).toThrow();
  });

  it("passes for accepted offers with a signed file", () => {
    expect(() => assertCanConfirmHire({ status: "accepted", signed_file_id: "f1" })).not.toThrow();
    expect(canConfirmHire({ status: "accepted", signed_file_id: "f1" })).toBe(true);
  });
});

describe("summarizeOfferFlow", () => {
  const base = { agreementFileId: null, signedFileId: null, applicationStage: "offer" };

  it("walks Draft → Awaiting response → Prepare agreement → Awaiting signature → Signed → Hired", () => {
    expect(summarizeOfferFlow({ ...base, status: "draft" }).headline).toBe("Draft");
    expect(summarizeOfferFlow({ ...base, status: "sent" }).headline).toBe("Awaiting response");
    expect(summarizeOfferFlow({ ...base, status: "accepted" }).headline).toBe("Prepare agreement");
    expect(summarizeOfferFlow({ ...base, status: "accepted", agreementFileId: "a" }).headline).toBe(
      "Awaiting signature",
    );
    expect(summarizeOfferFlow({ ...base, status: "accepted", signedFileId: "f" }).headline).toBe("Signed");
    expect(
      summarizeOfferFlow({ ...base, status: "accepted", signedFileId: "f", applicationStage: "hired" }).headline,
    ).toBe("Hired");
  });

  it("marks steps done / current / upcoming", () => {
    const steps = summarizeOfferFlow({ ...base, status: "accepted" }).steps;
    expect(steps.map((s) => s.state)).toEqual(["done", "done", "current", "upcoming"]);
  });

  it("reports declined and withdrawn as danger", () => {
    expect(summarizeOfferFlow({ ...base, status: "declined" }).tone).toBe("danger");
    expect(summarizeOfferFlow({ ...base, status: "withdrawn" }).headline).toBe("Withdrawn");
  });
});
