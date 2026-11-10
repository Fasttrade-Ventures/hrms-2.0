import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";

const publicDir = path.resolve(__dirname, "../../apps/web/public");

function pngSize(file: string) {
  const buf = readFileSync(file);
  expect(buf.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe("PWA manifest", () => {
  const m = manifest();

  it("is a standalone app named BukuHR that starts at the employee dashboard", () => {
    expect(m.name).toBe("BukuHR");
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/employee/dashboard");
  });

  it("declares 192 and 512 icons", () => {
    const icons = m.icons ?? [];
    expect(icons).toContainEqual(
      expect.objectContaining({ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }),
    );
    expect(icons).toContainEqual(
      expect.objectContaining({ src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }),
    );
  });

  it("ships real PNG files at those pixel sizes", () => {
    expect(pngSize(path.join(publicDir, "icons/icon-192.png"))).toEqual({ width: 192, height: 192 });
    expect(pngSize(path.join(publicDir, "icons/icon-512.png"))).toEqual({ width: 512, height: 512 });
  });
});

describe("service worker", () => {
  const sw = readFileSync(path.join(publicDir, "sw.js"), "utf8");

  it("keeps web push handlers", () => {
    expect(sw).toContain('addEventListener("push"');
    expect(sw).toContain('addEventListener("notificationclick"');
  });

  it("stays online-only: no fetch handler and no Cache API", () => {
    expect(sw).not.toMatch(/addEventListener\(\s*["']fetch["']/);
    expect(sw).not.toMatch(/\bcaches\b/);
  });
});
