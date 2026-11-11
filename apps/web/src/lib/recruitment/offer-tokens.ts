import { createHash, randomBytes } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";

export type OfferTokenPurpose = "respond" | "sign";

export const OFFER_TOKEN_TTL_DAYS = 14;

export type OfferTokenRow = {
  id: string;
  organization_id: string;
  offer_id: string;
  purpose: OfferTokenPurpose;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
};

export type OfferTokenCheck =
  | { ok: true; token: OfferTokenRow }
  | { ok: false; reason: "invalid" | "expired" | "used" };

export function hashOfferToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function generateRawOfferToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Pure rule check — no I/O. */
export function evaluateOfferToken(
  row: OfferTokenRow | null,
  purpose: OfferTokenPurpose,
  now: Date = new Date(),
): OfferTokenCheck {
  if (!row || row.purpose !== purpose) return { ok: false, reason: "invalid" };
  if (row.used_at) return { ok: false, reason: "used" };
  if (new Date(row.expires_at).getTime() <= now.getTime()) return { ok: false, reason: "expired" };
  return { ok: true, token: row };
}

/**
 * Creates a token and returns the raw value once (only the hash is stored).
 * Older unused tokens for the same offer + purpose are removed so a resend
 * invalidates the previous link.
 */
export async function createOfferToken(input: {
  organizationId: string;
  offerId: string;
  purpose: OfferTokenPurpose;
  ttlDays?: number;
}): Promise<{ token: string; expiresAt: string }> {
  const admin = createAdminClient();
  const token = generateRawOfferToken();
  const expiresAt = new Date(
    Date.now() + (input.ttlDays ?? OFFER_TOKEN_TTL_DAYS) * 24 * 60 * 60 * 1000,
  ).toISOString();

  await admin
    .from("job_offer_tokens")
    .delete()
    .eq("offer_id", input.offerId)
    .eq("organization_id", input.organizationId)
    .eq("purpose", input.purpose)
    .is("used_at", null);

  const { error } = await admin.from("job_offer_tokens").insert({
    organization_id: input.organizationId,
    offer_id: input.offerId,
    purpose: input.purpose,
    token_hash: hashOfferToken(token),
    expires_at: expiresAt,
  });
  if (error) throw new Error(error.message);

  return { token, expiresAt };
}

export async function verifyOfferToken(
  rawToken: string,
  purpose: OfferTokenPurpose,
): Promise<OfferTokenCheck> {
  if (!rawToken || rawToken.length < 16 || rawToken.length > 200) {
    return { ok: false, reason: "invalid" };
  }
  const admin = createAdminClient();
  const { data } = await admin
    .from("job_offer_tokens")
    .select("id, organization_id, offer_id, purpose, token_hash, expires_at, used_at")
    .eq("token_hash", hashOfferToken(rawToken))
    .maybeSingle();

  return evaluateOfferToken((data as OfferTokenRow | null) ?? null, purpose);
}

/** Atomically marks a token used. Returns false if it was already consumed. */
export async function consumeOfferToken(tokenId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("job_offer_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", tokenId)
    .is("used_at", null)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

/** Releases a consumed token (used when a downstream step fails so the link isn't burned). */
export async function releaseOfferToken(tokenId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("job_offer_tokens").update({ used_at: null }).eq("id", tokenId);
}
