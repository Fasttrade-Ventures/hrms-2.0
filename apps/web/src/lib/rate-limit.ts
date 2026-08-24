const globalForRateLimit = globalThis as unknown as {
  rateLimitStore?: Map<string, number[]>;
};

const rateLimitStore = globalForRateLimit.rateLimitStore ??= new Map<string, number[]>();

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

/**
 * Checks if an operation is allowed under rate limiting / spam prevention policies.
 * Uses a sliding window with support for an optional minimum cooldown between requests.
 *
 * @param key Unique key identifying the entity and operation (e.g. `leave:${employeeId}`)
 * @param limit Maximum number of requests allowed within the window
 * @param windowMs Time window in milliseconds
 * @param cooldownMs Minimum time required between consecutive requests in milliseconds
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  cooldownMs = 0
): RateLimitResult {
  const now = Date.now();
  const timestamps = rateLimitStore.get(key) || [];

  // Filter out timestamps outside the sliding window
  const validTimestamps = timestamps.filter((t) => now - t < windowMs);

  // Check minimum cooldown if configured
  if (cooldownMs > 0 && validTimestamps.length > 0) {
    const lastTimestamp = validTimestamps[validTimestamps.length - 1]!;
    const elapsed = now - lastTimestamp;
    if (elapsed < cooldownMs) {
      const retryAfter = Math.ceil((cooldownMs - elapsed) / 1000);
      return { allowed: false, retryAfterSeconds: Math.max(1, retryAfter) };
    }
  }

  // Check if limit is exceeded
  if (validTimestamps.length >= limit) {
    const oldestTimestamp = validTimestamps[0]!;
    const timeUntilExpiry = windowMs - (now - oldestTimestamp);
    const retryAfter = Math.ceil(timeUntilExpiry / 1000);
    return { allowed: false, retryAfterSeconds: Math.max(1, retryAfter) };
  }

  // Allow the request and record the timestamp
  validTimestamps.push(now);
  rateLimitStore.set(key, validTimestamps);
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Resets the entire rate limiter state. Primarily useful in test runs.
 */
export function clearRateLimitStore(): void {
  rateLimitStore.clear();
}
