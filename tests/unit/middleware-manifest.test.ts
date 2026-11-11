import { describe, expect, it } from "vitest";

import { config } from "@/middleware";
import { isPublicPath } from "@/lib/supabase/middleware";

describe("PWA manifest and auth middleware", () => {
  it("treats /manifest.webmanifest as a public path", () => {
    expect(isPublicPath("/manifest.webmanifest")).toBe(true);
    expect(isPublicPath("/hr/dashboard")).toBe(false);
  });

  it("keeps candidate offer respond/sign token pages public", () => {
    expect(isPublicPath("/offer/respond/abc")).toBe(true);
    expect(isPublicPath("/offer/sign/abc")).toBe(true);
    expect(isPublicPath("/offer/other")).toBe(false);
  });

  it("excludes the webmanifest extension from the middleware matcher", () => {
    const pattern = new RegExp(`^${config.matcher[0]}$`);
    expect(pattern.test("/manifest.webmanifest")).toBe(false);
    expect(pattern.test("/hr/dashboard")).toBe(true);
    expect(pattern.test("/auth/login")).toBe(true);
  });
});
