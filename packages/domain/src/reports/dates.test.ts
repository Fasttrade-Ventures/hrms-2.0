import { describe, expect, it } from "vitest";

import { resolveDatePreset } from "./dates";

describe("resolveDatePreset", () => {
  it("returns this month bounds", () => {
    expect(resolveDatePreset("this_month", "2026-07-15")).toEqual({
      from: "2026-07-01",
      to: "2026-07-31",
    });
  });

  it("returns YTD bounds", () => {
    expect(resolveDatePreset("ytd", "2026-07-15")).toEqual({
      from: "2026-01-01",
      to: "2026-07-15",
    });
  });
});
