import { afterEach, describe, expect, it } from "vitest";

import { checkRateLimit, clearRateLimitStore } from "@/lib/rate-limit";

afterEach(() => {
  clearRateLimitStore();
});

describe("checkRateLimit", () => {
  it("allows under the limit", () => {
    expect(checkRateLimit("t:1", 2, 60_000).allowed).toBe(true);
    expect(checkRateLimit("t:1", 2, 60_000).allowed).toBe(true);
  });

  it("blocks over the limit", () => {
    checkRateLimit("t:2", 1, 60_000);
    const blocked = checkRateLimit("t:2", 1, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("enforces cooldown between requests", () => {
    expect(checkRateLimit("t:3", 5, 60_000, 5_000).allowed).toBe(true);
    const blocked = checkRateLimit("t:3", 5, 60_000, 5_000);
    expect(blocked.allowed).toBe(false);
  });
});
