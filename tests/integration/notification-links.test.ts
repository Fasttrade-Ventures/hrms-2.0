import { describe, expect, it } from "vitest";

import { resolveNotificationHref } from "../../apps/web/src/lib/notifications/links";
import type { NotificationRow } from "../../apps/web/src/lib/notifications/types";

function row(
  template: string,
  payload: Record<string, unknown>,
): NotificationRow {
  return {
    id: "n1",
    template,
    payload,
    status: "sent",
    createdAt: "2026-07-24T00:00:00.000Z",
  };
}

describe("resolveNotificationHref", () => {
  it("routes HR announcement notifications to the HR announcements view", () => {
    expect(
      resolveNotificationHref(
        row("announcement.published", {
          title: "Test",
          announcementId: "55e36ff6-13a9-4b4a-b5dd-296dd8cc4f3e",
          href: "/employee/announcements/55e36ff6-13a9-4b4a-b5dd-296dd8cc4f3e",
        }),
        "hr",
      ),
    ).toBe("/hr/announcements?view=55e36ff6-13a9-4b4a-b5dd-296dd8cc4f3e");
  });

  it("extracts announcement id from legacy employee href", () => {
    expect(
      resolveNotificationHref(
        row("announcement.published", {
          title: "Test",
          href: "/employee/announcements/55e36ff6-13a9-4b4a-b5dd-296dd8cc4f3e",
        }),
        "hr",
      ),
    ).toBe("/hr/announcements?view=55e36ff6-13a9-4b4a-b5dd-296dd8cc4f3e");
  });
});
