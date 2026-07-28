import { describe, expect, it } from "vitest";

import { validateAnnouncementFile } from "../../apps/web/src/lib/announcements/upload-rules";

describe("validateAnnouncementFile", () => {
  it("accepts allowed files", () => {
    expect(
      validateAnnouncementFile({
        name: "policy.pdf",
        type: "application/pdf",
        size: 1024,
      }),
    ).toBeNull();
  });

  it("rejects oversized files", () => {
    expect(
      validateAnnouncementFile({
        name: "large.pdf",
        type: "application/pdf",
        size: 11 * 1024 * 1024,
      }),
    ).toMatch(/10 MB/);
  });

  it("rejects unsupported extensions", () => {
    expect(
      validateAnnouncementFile({
        name: "notes.docx",
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        size: 1024,
      }),
    ).toMatch(/not allowed/);
  });
});
