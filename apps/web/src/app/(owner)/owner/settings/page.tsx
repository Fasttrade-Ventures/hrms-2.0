import Link from "next/link";

import { StatusPill } from "@hrms/ui";

import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateModuleFlagFormAction, updateProductTierFormAction } from "@/app/(owner)/owner/actions";
import { getOwnerEntitlementSettings, type OwnerModuleSetting } from "@/lib/owner/entitlements";
import { requireRole } from "@/lib/auth/session";

function ModuleTable({ modules }: { modules: OwnerModuleSetting[] }) {
  if (modules.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-primary)]">
      <table className="w-full text-sm">
        <thead className="bg-[var(--surface-muted)] text-left text-[var(--foreground-muted)]">
          <tr>
            <th className="px-4 py-2 font-medium">Module</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {modules.map((module) => (
            <tr className="border-t border-[var(--border-primary)]" key={module.key}>
              <td className="px-4 py-3 font-medium">{module.label}</td>
              <td className="px-4 py-3">
                <StatusPill
                  label={module.enabled ? "Enabled" : "Disabled"}
                  tone={module.enabled ? "success" : "neutral"}
                />
              </td>
              <td className="px-4 py-3">
                {module.locked ? (
                  <span className="text-xs text-[var(--foreground-muted)]">Included in tier</span>
                ) : (
                  <form action={updateModuleFlagFormAction}>
                    <input name="module" type="hidden" value={module.key} />
                    <input name="enabled" type="hidden" value={module.enabled ? "false" : "true"} />
                    <Button size="sm" type="submit" variant="outline">
                      {module.enabled ? "Disable" : "Enable"}
                    </Button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function Page() {
  await requireRole("organization_owner");
  const settings = await getOwnerEntitlementSettings();

  const coreModules = settings.modules.filter((module) => module.tier === "Core");
  const professionalModules = settings.modules.filter((module) => module.tier === "Professional");
  const enterpriseModules = settings.modules.filter((module) => module.tier === "Enterprise");

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="Core includes people & workplace essentials. Professional adds payroll, assets, performance, and time modules. Enterprise adds analytics, API, and integrations."
        title="Module settings"
      />

      <Card size="sm">
        <CardHeader>
          <CardTitle>Product tier</CardTitle>
          <CardDescription>
            Current tier: <span className="font-medium capitalize">{settings.productTier}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(["core", "professional", "enterprise"] as const).map((tier) => (
            <form action={updateProductTierFormAction} key={tier}>
              <input name="tier" type="hidden" value={tier} />
              <Button type="submit" variant={settings.productTier === tier ? "default" : "outline"}>
                {tier}
              </Button>
            </form>
          ))}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground-primary)]">Core</h2>
          <p className="text-sm text-[var(--foreground-secondary)]">
            Announcements, calendar, and documents — always on for every tier.
          </p>
        </div>
        <ModuleTable modules={coreModules} />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground-primary)]">Professional</h2>
          <p className="text-sm text-[var(--foreground-secondary)]">
            Payroll, assets, performance, overtime, claims, GPS, and bulk import.
          </p>
        </div>
        <ModuleTable modules={professionalModules} />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground-primary)]">Enterprise</h2>
          <p className="text-sm text-[var(--foreground-secondary)]">
            Analytics, recruitment, payouts, audit, API, and integrations.
          </p>
        </div>
        <ModuleTable modules={enterpriseModules} />
      </section>

      <Link
        className="text-sm font-medium text-[var(--accent-primary)] hover:underline"
        href="/owner/dashboard"
      >
        Back to owner dashboard
      </Link>
    </div>
  );
}
