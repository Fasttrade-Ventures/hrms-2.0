const globalForRateLimit = globalThis as unknown as {
  rateLimitStore?: Map<string, number[]>;
};

const rateLimitStore = globalForRateLimit.rateLimitStore ??= new Map<string, number[]>();

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

/**
 * In-process sliding-window limiter (unit tests + fallback when DB RPC unavailable).
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  cooldownMs = 0,
): RateLimitResult {
  const now = Date.now();
  const timestamps = rateLimitStore.get(key) || [];

  const validTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (cooldownMs > 0 && validTimestamps.length > 0) {
    const lastTimestamp = validTimestamps[validTimestamps.length - 1]!;
    const elapsed = now - lastTimestamp;
    if (elapsed < cooldownMs) {
      const retryAfter = Math.ceil((cooldownMs - elapsed) / 1000);
      return { allowed: false, retryAfterSeconds: Math.max(1, retryAfter) };
    }
  }

  if (validTimestamps.length >= limit) {
    const oldestTimestamp = validTimestamps[0]!;
    const timeUntilExpiry = windowMs - (now - oldestTimestamp);
    const retryAfter = Math.ceil(timeUntilExpiry / 1000);
    return { allowed: false, retryAfterSeconds: Math.max(1, retryAfter) };
  }

  validTimestamps.push(now);
  rateLimitStore.set(key, validTimestamps);
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Durable limiter via Postgres `consume_rate_limit` (service role).
 * Falls back to in-memory when admin client / RPC is unavailable (local unit tests).
 */
export async function checkRateLimitDurable(
  key: string,
  limit: number,
  windowMs: number,
  cooldownMs = 0,
): Promise<RateLimitResult> {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("consume_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_ms: windowMs,
      p_cooldown_ms: cooldownMs,
    });

    if (!error && data != null) {
      const row = Array.isArray(data) ? data[0] : data;
      if (row && typeof row.allowed === "boolean") {
        return {
          allowed: row.allowed,
          retryAfterSeconds: Number(row.retry_after_seconds ?? 0),
        };
      }
    }
  } catch {
    // Fall through to memory.
  }

  return checkRateLimit(key, limit, windowMs, cooldownMs);
}

/** Resets the in-memory store. Primarily useful in test runs. */
export function clearRateLimitStore(): void {
  rateLimitStore.clear();
}
