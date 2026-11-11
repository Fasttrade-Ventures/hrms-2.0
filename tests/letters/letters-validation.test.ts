import { describe, expect, it } from "vitest";

import {
  createLetterTemplateSchema,
  createOfferSchema,
  updateDraftOfferSchema,
  updateLetterTemplateSchema,
} from "@hrms/validation";

const uuid = "11111111-1111-4111-8111-111111111111";

describe("letter template schemas", () => {
  it("accepts a valid offer template and defaults isActive", () => {
    const parsed = createLetterTemplateSchema.parse({
      name: " Standard offer ",
      type: "offer",
      body: "Dear {{candidate_name}}, welcome aboard.",
    });
    expect(parsed.name).toBe("Standard offer");
    expect(parsed.isActive).toBe(true);
  });

  it("rejects unknown types and short bodies", () => {
    expect(() => createLetterTemplateSchema.parse({ name: "x", type: "nda", body: "long enough body" })).toThrow();
    expect(() => createLetterTemplateSchema.parse({ name: "x", type: "offer", body: "short" })).toThrow();
  });

  it("accepts optional letterheadFileId (uuid or null)", () => {
    const base = { name: "x", type: "offer", body: "<p>Dear {{candidate_name}}</p>" } as const;
    expect(createLetterTemplateSchema.parse(base).letterheadFileId).toBeUndefined();
    expect(createLetterTemplateSchema.parse({ ...base, letterheadFileId: null }).letterheadFileId).toBeNull();
    expect(createLetterTemplateSchema.parse({ ...base, letterheadFileId: uuid }).letterheadFileId).toBe(uuid);
    expect(() => createLetterTemplateSchema.parse({ ...base, letterheadFileId: "nope" })).toThrow();
  });

  it("requires templateId on update", () => {
    expect(() =>
      updateLetterTemplateSchema.parse({ name: "x", type: "offer", body: "long enough body" }),
    ).toThrow();
  });
});

describe("offer schemas with templateId", () => {
  const base = {
    applicationId: uuid,
    jobTitle: "Engineer",
    basicSalary: "1000",
    startDate: "2027-01-04",
    letterBody: "<p>Dear {{candidate_name}}, welcome aboard.</p>",
  };

  it("requires templateId and letterBody for create", () => {
    expect(() => createOfferSchema.parse({ ...base, letterBody: undefined })).toThrow();
    expect(() => createOfferSchema.parse({ ...base, templateId: undefined })).toThrow();
    expect(createOfferSchema.parse({ ...base, templateId: uuid }).templateId).toBe(uuid);
  });

  it("requires offerId for draft update", () => {
    expect(() => updateDraftOfferSchema.parse({ ...base, templateId: uuid })).toThrow();
    expect(updateDraftOfferSchema.parse({ ...base, templateId: uuid, offerId: uuid }).offerId).toBe(uuid);
  });
});
