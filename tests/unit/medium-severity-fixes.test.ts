import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { canAccessPath } from "@/lib/auth/routes";
import { getPortalNav, portalBreadcrumbs } from "@/lib/portal-nav";

const root = resolve(__dirname, "../..");

function source(path: string): string {
  return readFileSync(resolve(root, path), "utf8");
}

describe("medium severity fixes", () => {
  it("keeps owner analytics inside the owner shell", () => {
    const owner = getPortalNav("Organization Owner");
    const analytics = owner.find((item) => item.label === "Analytics");

    expect(analytics?.href).toBe("/owner/analytics");
    expect(owner.some((item) => item.href.startsWith("/hr/"))).toBe(false);
    expect(canAccessPath("/owner/analytics", ["organization_owner"], [])).toBe(true);
    expect(source("apps/web/src/app/(owner)/owner/analytics/page.tsx")).toContain("AnalyticsDashboard");
  });

  it("builds breadcrumbs only for detail paths", () => {
    expect(portalBreadcrumbs("/hr/employees")).toEqual([]);
    expect(portalBreadcrumbs("/hr/employees/00000000-0000-4000-8000-000000000001")).toEqual([
      { href: "/hr", label: "HR" },
      { href: "/hr/employees", label: "Employees" },
      { href: "/hr/employees/00000000-0000-4000-8000-000000000001", label: "Detail" },
    ]);
    expect(portalBreadcrumbs("/owner/profile/security")).toEqual([
      { href: "/owner", label: "Owner" },
      { href: "/owner/profile", label: "Profile" },
      { href: "/owner/profile/security", label: "Security" },
    ]);
  });

  it("does not describe the standalone product as Malaysia-only", () => {
    const login = source("apps/web/src/app/(auth)/auth/login/page.tsx");
    const standalone = login.slice(login.indexOf("standaloneBrand"), login.indexOf("saasBrand"));

    expect(standalone).not.toContain("Malaysia payroll");
    expect(standalone).toContain("Australia");
  });

  it("greets the owner by name and points at settings that exist", () => {
    const dashboard = source("apps/web/src/app/(owner)/owner/dashboard/page.tsx");

    expect(dashboard).toContain("firstNameFromFullName");
    expect(dashboard).not.toContain(", Owner");
    expect(dashboard).not.toContain("have not shipped");
    expect(dashboard).toContain("ConfirmModuleToggle");
  });

  it("asks before an owner enable or disable", () => {
    const toggle = source("apps/web/src/components/owner/confirm-module-toggle.tsx");
    const settings = source("apps/web/src/app/(owner)/owner/settings/page.tsx");

    expect(toggle).toContain("ConfirmDialog");
    expect(toggle).toContain('type="button"');
    expect(settings.match(/ConfirmModuleToggle/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("labels stacked directory fields below the md breakpoint", () => {
    const directory = source("apps/web/src/components/hr/employees/employee-list.tsx");

    expect(directory).toContain('className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:hidden"');
    for (const label of ["Job title", "Branch / Dept", "Joined", "Login", "Status"]) {
      expect(directory).toContain(label);
    }
  });

  it("adds a skip link and marks the current nav item", () => {
    const shell = source("apps/web/src/components/portal-shell.tsx");
    const nav = source("apps/web/src/components/portal/portal-nav-group.tsx");

    expect(shell).toContain('href="#portal-main"');
    expect(shell).toContain("Skip to content");
    expect(shell).toContain('id="portal-main"');
    expect(shell).toContain("portalBreadcrumbs");
    expect(nav).toContain('aria-current={active ? "page" : undefined}');
  });

  it("does not nest a button inside the forgot-password link", () => {
    const form = source("apps/web/src/app/(auth)/auth/forgot-password/forgot-password-form.tsx");

    expect(form).not.toContain("<Link");
    expect(form).toContain('href="/auth/login"');
  });

  it("uses one list table and one stat card", () => {
    expect(source("packages/ui/src/list-card.tsx")).toContain("<table");
    expect(source("apps/web/src/components/hr/payroll/payrun-list-table.tsx")).toContain("ListCard");
    expect(source("apps/web/src/components/hr/hr-ui.tsx")).toContain("<StatCard");
  });

  it("traps focus inside the confirm dialog", () => {
    const dialog = source("packages/ui/src/confirm-dialog.tsx");

    expect(dialog).toContain('e.key === "Tab"');
    expect(dialog).toContain("previouslyFocused");
    expect(dialog).toContain("dialogRef");
  });

  it("shares one control height and the brand primary token", () => {
    const button = source("apps/web/src/components/ui/button.tsx");
    const input = source("apps/web/src/components/ui/input.tsx");
    const css = source("apps/web/src/app/globals.css");
    const root = css.slice(css.indexOf(":root"), css.indexOf(".auth-theme"));

    expect(button).toContain('default:\n          "h-10');
    expect(button).toContain("bg-[var(--accent-primary)]");
    expect(input).toContain("h-10");
    expect(input).toContain("bg-[var(--surface-card)]");
    expect(root).toContain("--primary: var(--accent-primary)");
    expect(root).not.toContain("oklch(0.205 0 0)");
  });
});
