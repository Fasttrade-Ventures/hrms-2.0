import { describe, expect, it } from "vitest";

import { buildAnnouncementEmail } from "@hrms/platform";

describe("announcement email", () => {
  it("includes the title, message, and a link to the announcement", () => {
    const email = buildAnnouncementEmail({
      title: "Office closed Friday",
      message: "The office is closed this Friday.",
      announcementUrl: "http://localhost:3000/employee/announcements/abc",
    });

    expect(email.subject).toBe("Office closed Friday");
    expect(email.text).toContain("The office is closed this Friday.");
    expect(email.text).toContain("http://localhost:3000/employee/announcements/abc");
    expect(email.html).toContain("Read it in BukuHR");
    expect(email.html).not.toContain("<script>");
  });
});
