import { describe, expect, it } from "vitest";

import {
  shouldDeferAnnouncementNotifications,
  shouldSendAnnouncementNotifications,
} from "../../apps/web/src/lib/announcements/schedule";

describe("shouldDeferAnnouncementNotifications", () => {
  it("defers when schedule date is in the future", () => {
    expect(shouldDeferAnnouncementNotifications("schedule", "2026-08-01", "2026-07-28")).toBe(true);
  });

  it("does not defer publish now", () => {
    expect(shouldDeferAnnouncementNotifications("publish_now", null, "2026-07-28")).toBe(false);
  });

  it("does not defer when schedule date is today", () => {
    expect(shouldDeferAnnouncementNotifications("schedule", "2026-07-28", "2026-07-28")).toBe(false);
  });
});

describe("shouldSendAnnouncementNotifications", () => {
  it("sends when published and display date has arrived", () => {
    expect(
      shouldSendAnnouncementNotifications(
        {
          status: "published",
          displayFrom: "2026-07-28",
          notificationsSentAt: null,
        },
        "2026-07-28",
      ),
    ).toBe(true);
  });

  it("waits until display date for scheduled announcements", () => {
    expect(
      shouldSendAnnouncementNotifications(
        {
          status: "published",
          displayFrom: "2026-08-01",
          notificationsSentAt: null,
        },
        "2026-07-28",
      ),
    ).toBe(false);
  });

  it("skips when notifications were already sent", () => {
    expect(
      shouldSendAnnouncementNotifications(
        {
          status: "published",
          displayFrom: "2026-07-01",
          notificationsSentAt: "2026-07-01T08:00:00.000Z",
        },
        "2026-07-28",
      ),
    ).toBe(false);
  });
});
