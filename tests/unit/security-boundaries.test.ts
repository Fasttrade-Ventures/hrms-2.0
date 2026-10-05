import { describe, expect, it } from "vitest";

import { clientIpFromForwarded } from "../../apps/web/src/lib/auth/client-ip";
import { authorizeCron } from "../../apps/web/src/lib/cron/authorize";

describe("clientIpFromForwarded", () => {
  it("uses the last forwarded hop so a caller cannot pick the rate-limit key", () => {
    expect(clientIpFromForwarded("1.1.1.1, 203.0.113.8", null)).toBe("203.0.113.8");
  });

  it("falls back to x-real-ip", () => {
    expect(clientIpFromForwarded(null, "203.0.113.9")).toBe("203.0.113.9");
  });
});

describe("authorizeCron", () => {
  it("rejects the request when CRON_SECRET is missing", () => {
    const previous = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;
    const response = authorizeCron(new Request("http://localhost/api/cron/leave-accrual"));
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
    expect(response).toBe(false);
  });

  it("rejects a wrong bearer token", () => {
    process.env.CRON_SECRET = "expected-secret";
    const response = authorizeCron(
      new Request("http://localhost/api/cron/leave-accrual", {
        headers: { authorization: "Bearer other-secret" },
      }),
    );
    expect(response).toBe(false);
  });
});
