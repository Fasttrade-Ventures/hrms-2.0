import { describe, expect, it } from "vitest";

import {
  evaluateOfferToken,
  generateRawOfferToken,
  hashOfferToken,
  type OfferTokenRow,
} from "@/lib/recruitment/offer-tokens";

function row(overrides: Partial<OfferTokenRow> = {}): OfferTokenRow {
  return {
    id: "t1",
    organization_id: "o1",
    offer_id: "f1",
    purpose: "respond",
    token_hash: "h",
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    used_at: null,
    ...overrides,
  };
}

describe("hashOfferToken", () => {
  it("is a deterministic sha256 hex digest that differs from the raw token", () => {
    const raw = generateRawOfferToken();
    expect(hashOfferToken(raw)).toBe(hashOfferToken(raw));
    expect(hashOfferToken(raw)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashOfferToken(raw)).not.toBe(raw);
    expect(hashOfferToken(raw)).not.toBe(hashOfferToken(`${raw}x`));
  });

  it("generates unguessable, URL-safe tokens", () => {
    const a = generateRawOfferToken();
    const b = generateRawOfferToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});

describe("evaluateOfferToken", () => {
  it("accepts a fresh token for the matching purpose", () => {
    expect(evaluateOfferToken(row(), "respond").ok).toBe(true);
  });

  it("rejects unknown tokens and wrong purpose as invalid", () => {
    expect(evaluateOfferToken(null, "respond")).toEqual({ ok: false, reason: "invalid" });
    expect(evaluateOfferToken(row({ purpose: "sign" }), "respond")).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects used and expired tokens", () => {
    expect(evaluateOfferToken(row({ used_at: new Date().toISOString() }), "respond")).toEqual({
      ok: false,
      reason: "used",
    });
    expect(
      evaluateOfferToken(row({ expires_at: new Date(Date.now() - 1000).toISOString() }), "respond"),
    ).toEqual({ ok: false, reason: "expired" });
  });
});
