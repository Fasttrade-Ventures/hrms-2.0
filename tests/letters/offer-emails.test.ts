import { describe, expect, it } from "vitest";

import { buildAgreementToSignEmail, buildOfferSentEmail } from "@hrms/platform";

describe("offer emails", () => {
  it("includes accept and reject links and escapes names", () => {
    const { subject, html, text } = buildOfferSentEmail({
      candidateName: "<b>Ada</b>",
      organizationName: "Acme",
      jobTitle: "Engineer",
      acceptUrl: "https://x.test/offer/respond/t?decision=accept",
      rejectUrl: "https://x.test/offer/respond/t?decision=reject",
      expiresInDays: 14,
    });
    expect(subject).toContain("Acme");
    expect(text).toContain("decision=accept");
    expect(text).toContain("decision=reject");
    expect(html).not.toContain("<b>Ada</b>");
    expect(html).toContain("&lt;b&gt;Ada");
  });

  it("agreement email carries the sign link", () => {
    const { text, html } = buildAgreementToSignEmail({
      candidateName: "Ada",
      organizationName: "Acme",
      jobTitle: "Engineer",
      signUrl: "https://x.test/offer/sign/tok",
      expiresInDays: 14,
      hasAttachment: true,
    });
    expect(text).toContain("https://x.test/offer/sign/tok");
    expect(html).toContain("attached");
  });
});
