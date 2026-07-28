import { describe, expect, it } from "vitest";

import {
  computeArchiveCutoff,
  matchesSiemEventFilter,
} from "../../apps/web/src/lib/audit/siem";
import {
  shouldDeferAnnouncementNotifications,
  shouldSendAnnouncementNotifications,
} from "../../apps/web/src/lib/announcements/schedule";

describe("matchesSiemEventFilter", () => {
  it("matches all events when filter is empty", () => {
    expect(matchesSiemEventFilter("document.downloaded", [])).toBe(true);
  });

  it("matches prefix patterns", () => {
    expect(matchesSiemEventFilter("approval.approved", ["approval.*"])).toBe(true);
    expect(matchesSiemEventFilter("document.downloaded", ["approval.*"])).toBe(false);
  });
});

describe("computeArchiveCutoff", () => {
  it("subtracts retention days from as-of date", () => {
    expect(computeArchiveCutoff("2026-07-28", 7)).toBe("2026-07-21T00:00:00.000Z");
  });
});

describe("shouldSendAnnouncementNotifications", () => {
  it("waits for scheduled display date", () => {
    expect(
      shouldSendAnnouncementNotifications(
        { status: "published", displayFrom: "2026-08-01", notificationsSentAt: null },
        "2026-07-28",
      ),
    ).toBe(false);
  });
});

describe("shouldDeferAnnouncementNotifications", () => {
  it("defers future schedule dates", () => {
    expect(shouldDeferAnnouncementNotifications("schedule", "2026-08-01", "2026-07-28")).toBe(true);
  });
});
