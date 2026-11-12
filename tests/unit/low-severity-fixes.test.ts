import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { formatPortalDate, localeForCountry } from "@/lib/locale";
import { getHrMobileMoreItems } from "@/lib/portal-nav";

const root = resolve(__dirname, "../..");

function source(path: string): string {
  return readFileSync(resolve(root, path), "utf8");
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return path.endsWith(".ts") || path.endsWith(".tsx") ? [path] : [];
  });
}

describe("low severity fixes", () => {
  it("formats the shell date in the organisation locale", () => {
    const date = new Date(2026, 10, 10);

    expect(localeForCountry("AU")).toBe("en-AU");
    expect(localeForCountry("MY")).toBe("en-MY");
    expect(formatPortalDate(date, "AU")).toMatch(/10\/11\/2026$/);
    expect(formatPortalDate(date, "MY")).toMatch(/10\/11\/2026$/);

    const shell = source("apps/web/src/components/portal-shell.tsx");
    const layout = source("apps/web/src/components/portal-layout.tsx");
    expect(shell).toContain("formatPortalDate(today, country)");
    expect(shell).not.toContain("en-MY");
    expect(layout).toContain("country={country}");
    expect(layout).toContain("getOrganizationCountry()");
  });

  it("masks the tax file number until it is revealed", () => {
    const field = source("apps/web/src/components/hr/employees/masked-secret.tsx");
    const form = source("apps/web/src/components/hr/employees/au-employee-fields.tsx");
    const profile = source("apps/web/src/components/hr/employees/employee-profile-view.tsx");

    const tax = form.slice(form.indexOf("Tax File Number"), form.indexOf('id="bsb"'));

    expect(field).toContain('type={shown ? "text" : "password"}');
    expect(field).toContain("Show");
    expect(tax).toContain("MaskedTaxNumberField");
    expect(tax).not.toContain("HrTextInput");
    expect(profile).toContain("<MaskedSecret");
  });

  it("keeps Lucide inside the shadcn primitives", () => {
    const web = resolve(root, "apps/web/src");
    const offenders = sourceFiles(web)
      .filter((file) => !relative(web, file).replace(/\\/g, "/").startsWith("components/ui/"))
      .filter((file) => source(file).includes('from "lucide-react"') || source(file).includes("from 'lucide-react'"));

    expect(offenders.map((file) => relative(root, file))).toEqual([]);
  });

  it("gives HR a phone bar without repeating the four primary tabs", () => {
    const more = getHrMobileMoreItems().map((item) => item.href);

    expect(more).toContain("/hr/operations");
    expect(more).not.toContain("/hr/dashboard");
    expect(more).not.toContain("/hr/employees");
    expect(more).not.toContain("/hr/leave");
    expect(more).not.toContain("/hr/payroll");
    expect(source("apps/web/src/components/portal-shell.tsx")).toContain("<HrMobileNav");
  });
});
