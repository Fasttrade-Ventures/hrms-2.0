import { describe, expect, it } from "vitest";

import {
  announcementMatchesAudience,
  getAnnouncementDisplayStatus,
  isAnnouncementInDisplayWindow,
  summarizeAnnouncementAudience,
} from "../../apps/web/src/lib/announcements/audience";

describe("announcementMatchesAudience", () => {
  const everyone: AnnouncementAudienceFixture = {
    branchId: null,
    targetRoles: [],
    targetDepartmentIds: [],
  };

  it("matches everyone when no filters are set", () => {
    expect(
      announcementMatchesAudience(everyone, {
        branchId: "b1",
        departmentId: "d1",
        roles: ["employee"],
      }),
    ).toBe(true);
  });

  it("filters by branch", () => {
    expect(
      announcementMatchesAudience(
        { ...everyone, branchId: "b1" },
        { branchId: "b2", departmentId: null, roles: ["employee"] },
      ),
    ).toBe(false);
  });

  it("filters by role", () => {
    expect(
      announcementMatchesAudience(
        { ...everyone, targetRoles: ["manager"] },
        { branchId: null, departmentId: null, roles: ["employee"] },
      ),
    ).toBe(false);
  });

  it("filters by department", () => {
    expect(
      announcementMatchesAudience(
        { ...everyone, targetDepartmentIds: ["d1"] },
        { branchId: null, departmentId: "d2", roles: ["employee"] },
      ),
    ).toBe(false);
  });
});

type AnnouncementAudienceFixture = {
  branchId: string | null;
  targetRoles: string[];
  targetDepartmentIds: string[];
};

describe("isAnnouncementInDisplayWindow", () => {
  it("hides drafts and future scheduled items", () => {
    expect(
      isAnnouncementInDisplayWindow(
        { status: "draft", displayFrom: null, displayUntil: null },
        "2026-07-24",
      ),
    ).toBe(false);

    expect(
      isAnnouncementInDisplayWindow(
        { status: "published", displayFrom: "2026-07-25", displayUntil: null },
        "2026-07-24",
      ),
    ).toBe(false);
  });

  it("shows active published announcements", () => {
    expect(
      isAnnouncementInDisplayWindow(
        { status: "published", displayFrom: "2026-07-24", displayUntil: "2026-08-01" },
        "2026-07-24",
      ),
    ).toBe(true);
  });
});

describe("getAnnouncementDisplayStatus", () => {
  it("returns scheduled for future display_from", () => {
    expect(
      getAnnouncementDisplayStatus(
        { status: "published", displayFrom: "2026-08-01", displayUntil: null },
        "2026-07-24",
      ),
    ).toBe("scheduled");
  });

  it("returns expired after display_until passes", () => {
    expect(
      getAnnouncementDisplayStatus(
        { status: "published", displayFrom: null, displayUntil: "2026-07-23" },
        "2026-07-24",
      ),
    ).toBe("expired");
  });
});

describe("summarizeAnnouncementAudience", () => {
  it("returns Everyone when no filters", () => {
    expect(
      summarizeAnnouncementAudience({
        branchName: null,
        departmentNames: [],
        targetRoles: [],
      }),
    ).toBe("Everyone");
  });
});
