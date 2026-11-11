import { describe, expect, it } from "vitest";

import { applyMergeTags, LETTER_MERGE_TAGS } from "@/lib/letters/merge-tags";

describe("applyMergeTags", () => {
  it("replaces known tags", () => {
    const body = "Hello {{candidate_name}}, role {{job_title}} at {{organization_name}}.";
    expect(
      applyMergeTags(body, {
        candidate_name: "Acap Test",
        job_title: "Engineer",
        organization_name: "Hirix",
      }),
    ).toBe("Hello Acap Test, role Engineer at Hirix.");
  });

  it("leaves unknown tags unchanged", () => {
    expect(applyMergeTags("Hi {{unknown_tag}}", { candidate_name: "A" })).toBe("Hi {{unknown_tag}}");
  });

  it("formats salary when provided as number", () => {
    expect(applyMergeTags("Pay {{salary}} {{currency}}", { salary: 5000, currency: "MYR" })).toBe(
      "Pay 5000.00 MYR",
    );
  });

  it("exports the v1 tag list", () => {
    expect(LETTER_MERGE_TAGS).toContain("candidate_name");
    expect(LETTER_MERGE_TAGS).toContain("start_date");
  });

  it("supports requisition and org contact tags", () => {
    expect(LETTER_MERGE_TAGS).toEqual(
      expect.arrayContaining([
        "offer_date",
        "department",
        "employment_type",
        "work_location",
        "company_email",
        "company_phone",
      ]),
    );
    expect(
      applyMergeTags(
        "{{offer_date}} · {{department}} · {{employment_type}} · {{work_location}} · {{company_email}} · {{company_phone}}",
        {
          offer_date: "11 November 2026",
          department: "Finance",
          employment_type: "Full time",
          work_location: "KL Office",
          company_email: "hr@acme.test",
          company_phone: "+60 3 1234 5678",
        },
      ),
    ).toBe("11 November 2026 · Finance · Full time · KL Office · hr@acme.test · +60 3 1234 5678");
  });

  it("inserts spaces when a tag is glued to neighbouring words", () => {
    expect(applyMergeTags("I,{{candidate_name}}procured this.", { candidate_name: "Ada" })).toBe(
      "I, Ada procured this.",
    );
  });

  it("does not insert spaces next to punctuation", () => {
    expect(applyMergeTags("Dear {{candidate_name}},", { candidate_name: "Ada" })).toBe("Dear Ada,");
    expect(applyMergeTags("({{candidate_name}})", { candidate_name: "Ada" })).toBe("(Ada)");
  });

  it("keeps a space when an empty tag sat between non-space tokens", () => {
    expect(applyMergeTags("...................{{candidate_name}}procured", { candidate_name: "" })).toBe(
      "................... procured",
    );
  });
});
