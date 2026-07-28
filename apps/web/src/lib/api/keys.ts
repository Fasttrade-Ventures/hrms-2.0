import { createHash, randomBytes } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";

const KEY_PREFIX = "hrms_live_";

export type CreatedApiKey = {
  id: string;
  name: string;
  prefix: string;
  secret: string;
};

function hashKey(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function generateApiKeySecret(): { prefix: string; secret: string; hash: string } {
  const raw = randomBytes(24).toString("base64url");
  const secret = `${KEY_PREFIX}${raw}`;
  const prefix = secret.slice(0, 16);
  return { prefix, secret, hash: hashKey(secret) };
}

export async function createApiKey(input: {
  organizationId: string;
  name: string;
  createdByUserId: string;
}): Promise<CreatedApiKey> {
  const { prefix, secret, hash } = generateApiKeySecret();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("api_keys")
    .insert({
      organization_id: input.organizationId,
      name: input.name,
      key_prefix: prefix,
      key_hash: hash,
      created_by_user_id: input.createdByUserId,
    })
    .select("id, name, key_prefix")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create API key.");

  return { id: data.id, name: data.name, prefix: data.key_prefix, secret };
}

export async function revokeApiKey(organizationId: string, keyId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);
}

export async function listApiKeys(organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("api_keys")
    .select("id, name, key_prefix, scopes, last_used_at, revoked_at, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function authenticateApiKey(
  authorizationHeader: string | null,
  apiKeyHeader: string | null,
): Promise<{ organizationId: string; keyId: string } | null> {
  const token =
    authorizationHeader?.startsWith("Bearer ")
      ? authorizationHeader.slice(7).trim()
      : apiKeyHeader?.trim();

  if (!token?.startsWith(KEY_PREFIX)) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("api_keys")
    .select("id, organization_id, key_hash, revoked_at")
    .eq("key_hash", hashKey(token))
    .maybeSingle();

  if (error || !data || data.revoked_at) return null;

  void admin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return { organizationId: data.organization_id, keyId: data.id };
}
