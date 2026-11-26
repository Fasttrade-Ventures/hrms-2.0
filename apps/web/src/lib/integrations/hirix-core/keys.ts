/**
 * Hirix Core connects to BukuHR with an ordinary Developer API key that is
 * locked to one permission: creating employees. The key is recognised by its
 * fixed name and scope, so no extra column is needed.
 */
export const HIRIX_CORE_KEY_NAME = "Hirix Core";
export const HIRIX_CORE_SCOPES = ["employees:write"] as const;

export type ApiKeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[] | null;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

function isHirixCoreScope(scopes: string[] | null): boolean {
  return scopes?.length === 1 && scopes[0] === HIRIX_CORE_SCOPES[0];
}

/** The newest live Hirix Core key, or null when none is set up. */
export function findHirixCoreKey(keys: ApiKeyRow[]): ApiKeyRow | null {
  const live = keys
    .filter((key) => !key.revoked_at && key.name === HIRIX_CORE_KEY_NAME && isHirixCoreScope(key.scopes))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return live[0] ?? null;
}

/** Every live key carrying the Hirix Core name, whatever its scopes. Used to rotate safely. */
export function liveHirixCoreKeyIds(keys: ApiKeyRow[]): string[] {
  return keys.filter((key) => !key.revoked_at && key.name === HIRIX_CORE_KEY_NAME).map((key) => key.id);
}
