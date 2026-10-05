import { describe, expect, it } from "vitest";

import { isPastRetention } from "@/lib/audit/record-retention";

describe("record retention", () => {
  it("keeps a record when that retention window is not set", () => {
    expect(
      isPastRetention({
        asOf: "2026-10-06T00:00:00.000Z",
        retentionDays: null,
        recordAt: "2020-01-01T00:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("marks a document or policy file once it is older than its own window", () => {
    expect(
      isPastRetention({
        asOf: "2026-10-06T00:00:00.000Z",
        retentionDays: 30,
        recordAt: "2026-08-01T00:00:00.000Z",
      }),
    ).toBe(true);
    expect(
      isPastRetention({
        asOf: "2026-10-06T00:00:00.000Z",
        retentionDays: 30,
        recordAt: "2026-09-20T00:00:00.000Z",
      }),
    ).toBe(false);
  });
});
