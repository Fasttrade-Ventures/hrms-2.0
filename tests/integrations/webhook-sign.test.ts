import { describe, expect, it } from "vitest";

import { buildWebhookSignatureHeader, matchesEventFilter, verifyWebhookSignature } from "@/lib/integrations/webhooks/sign";

describe("webhook signing", () => {
  it("signs and verifies payload", () => {
    const secret = "test-secret";
    const body = JSON.stringify({ event: "employee.created" });
    const timestamp = "1710000000000";
    const signature = buildWebhookSignatureHeader(secret, body, timestamp);
    expect(verifyWebhookSignature(secret, body, timestamp, signature)).toBe(true);
  });

  it("matches audit wildcard filter", () => {
    expect(matchesEventFilter("audit.employee.created", ["audit.*"])).toBe(true);
    expect(matchesEventFilter("leave.submitted", ["audit.*"])).toBe(false);
  });
});
