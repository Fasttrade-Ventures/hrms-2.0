import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { showsMalaysianIdentityFields } from "@/lib/employees/malaysia-demographics";
import {
  getEmployeeMobileMoreItems,
  getPortalNav,
  getPortalProfileHref,
  getPortalSettingsHref,
  notificationsHref,
  resolvePortalNavLabel,
} from "@/lib/portal-nav";

const root = resolve(__dirname, "../..");

function contrast(foreground: string, background: string): number {
  const channel = (hex: string, shift: number) => {
    const value = parseInt(hex.slice(1), 16) >> shift & 255;
    const channelValue = value / 255;
    return channelValue <= 0.03928
      ? channelValue / 12.92
      : ((channelValue + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (hex: string) =>
    0.2126 * channel(hex, 16) + 0.7152 * channel(hex, 8) + 0.0722 * channel(hex, 0);
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

describe("portal account links stay inside the signed-in portal", () => {
  it.each([
    ["Employee", "/employee"],
    ["Manager", "/manager"],
    ["HR Administrator", "/hr"],
    ["Branch Admin", "/branch-admin"],
    ["Director", "/director"],
    ["Organization Owner", "/owner"],
    ["Platform Admin", "/platform"],
    ["Auditor", "/auditor"],
  ])("%s profile, security, and notifications use %s", (portal, prefix) => {
    expect(getPortalProfileHref(portal)).toBe(`${prefix}/profile`);
    expect(getPortalSettingsHref(portal)).toBe(`${prefix}/profile/security`);
    expect(notificationsHref(portal)).toBe(`${prefix}/notifications`);
  });

  it("names profile and security pages in the shell", () => {
    expect(resolvePortalNavLabel("Organization Owner", "/owner/profile")).toBe("Profile");
    expect(resolvePortalNavLabel("Organization Owner", "/owner/profile/security")).toBe("Security");
    expect(resolvePortalNavLabel("Auditor", "/auditor/notifications")).toBe("Notifications");
  });
});

describe("auditor reports stay in the auditor portal", () => {
  it("does not link the auditor sidebar at the HR layout", () => {
    const hrefs = getPortalNav("Auditor").map((item) => item.href);
    expect(hrefs).toContain("/auditor/reports");
    expect(hrefs).not.toContain("/hr/reports");
  });
});

describe("employee phone menu includes the sidebar destinations", () => {
  it("lists the destinations that are not already in the tab bar", () => {
    const hrefs = getEmployeeMobileMoreItems().map((item) => item.href);
    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/employee/schedule",
        "/employee/manual-attendance",
        "/employee/report-late",
        "/employee/timesheet",
        "/employee/policies",
        "/employee/assets",
        "/employee/performance",
        "/employee/pulse",
        "/employee/profile",
      ]),
    );
    expect(hrefs).not.toContain("/employee/leave");
    expect(hrefs).not.toContain("/employee/attendance");
    expect(hrefs).not.toContain("/employee/payslips");
  });
});

describe("Australian employee identity fields", () => {
  it("keeps race, religion, and IC for Malaysia and hides them for Australia", () => {
    expect(showsMalaysianIdentityFields("MY")).toBe(true);
    expect(showsMalaysianIdentityFields("AU")).toBe(false);
  });

  it("gates those labels in the create and edit forms", () => {
    for (const file of [
      "apps/web/src/components/hr/employees/create-employee-form.tsx",
      "apps/web/src/components/hr/employees/edit-employee-form.tsx",
    ]) {
      const source = readFileSync(resolve(root, file), "utf8");
      expect(source.match(/showsMalaysianIdentityFields\(country\)/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("sign-in does not pretend to control the session", () => {
  it("removes the keep-me-signed-in control and the muted email fill", () => {
    const source = readFileSync(
      resolve(root, "apps/web/src/app/(auth)/auth/login/login-form.tsx"),
      "utf8",
    );
    expect(source).not.toContain("Keep me signed in");
    expect(source).not.toContain("Supabase refresh");
    const emailField = source.slice(source.indexOf('id="email"'), source.indexOf("AuthPasswordField"));
    expect(emailField).not.toMatch(/\bmuted\b/);
  });
});

describe("signed-in pages have one h1", () => {
  it("keeps the page title as the only h1 and demotes the shell context label", () => {
    const header = readFileSync(
      resolve(root, "apps/web/src/components/portal/portal-primitives.tsx"),
      "utf8",
    );
    const pageHeader = header.slice(header.indexOf("export function PortalPageHeader"));
    expect(pageHeader).toContain("<h1");
    expect(pageHeader).not.toContain("<h2");

    const shell = readFileSync(resolve(root, "apps/web/src/components/portal-shell.tsx"), "utf8");
    expect(shell).not.toContain("<h1");

    for (const file of [
      "apps/web/src/app/(employee)/employee/dashboard/page.tsx",
      "apps/web/src/app/(employee)/employee/leave/page.tsx",
    ]) {
      const source = readFileSync(resolve(root, file), "utf8");
      expect(source).toContain("<h1");
      expect(source.match(/<h1\b/g)?.length ?? 0).toBe(1);
    }

    // ReportRunner sits under PortalPageHeader on report pages — keep its title as h2.
    const reportRunner = readFileSync(
      resolve(root, "apps/web/src/components/reports/report-runner.tsx"),
      "utf8",
    );
    expect(reportRunner).not.toContain("<h1");
  });
});

describe("muted text contrast", () => {
  it("passes WCAG AA for normal text on white, stone, and the muted surface", () => {
    const css = readFileSync(resolve(root, "apps/web/src/app/globals.css"), "utf8");
    const colors = [...css.matchAll(/--foreground-muted:\s*(#[0-9a-fA-F]{6})/g)].map((match) =>
      match[1].toLowerCase(),
    );
    expect(colors.length).toBeGreaterThan(0);
    for (const color of colors) {
      expect(contrast(color, "#ffffff")).toBeGreaterThanOrEqual(4.5);
      expect(contrast(color, "#f5f3ee")).toBeGreaterThanOrEqual(4.5);
      expect(contrast(color, "#e8e4db")).toBeGreaterThanOrEqual(4.5);
    }
  });
});
