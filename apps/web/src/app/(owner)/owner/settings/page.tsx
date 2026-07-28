import Link from "next/link";

import { ListCard, StatusPill } from "@hrms/ui";

import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateModuleFlagFormAction, updateProductTierFormAction } from "@/app/(owner)/owner/actions";
import { getOwnerEntitlementSettings } from "@/lib/owner/entitlements";
import { requireRole } from "@/lib/auth/session";

export default async function Page() {
  await requireRole("organization_owner");
  const settings = await getOwnerEntitlementSettings();

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="Control product tier and optional module flags for this organization."
        title="Module settings"
      />

      <Card size="sm">
        <CardHeader>
          <CardTitle>Product tier</CardTitle>
          <CardDescription>Current tier: {settings.productTier}</CardDescription>
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

      <ListCard
        columns={[
          { key: "module", label: "Module" },
          { key: "tier", label: "Tier", className: "w-32" },
          { key: "status", label: "Status", className: "w-28" },
          { key: "action", label: "", className: "w-32" },
        ]}
        header={<p className="text-sm font-medium text-[var(--foreground-primary)]">Module flags</p>}
        rows={settings.modules.map((module) => ({
          id: module.key,
          cells: {
            module: <span className="font-medium">{module.label}</span>,
            tier: <span className="text-sm text-[var(--foreground-secondary)]">{module.tier}</span>,
            status: (
              <StatusPill
                label={module.enabled ? "Enabled" : "Disabled"}
                tone={module.enabled ? "success" : "neutral"}
              />
            ),
            action: module.locked ? (
              <span className="text-xs text-[var(--foreground-muted)]">Core bundle</span>
            ) : (
              <form action={updateModuleFlagFormAction}>
                <input name="module" type="hidden" value={module.key} />
                <input name="enabled" type="hidden" value={module.enabled ? "false" : "true"} />
                <Button size="sm" type="submit" variant="outline">
                  {module.enabled ? "Disable" : "Enable"}
                </Button>
              </form>
            ),
          },
        }))}
      />

      <Link
        className="text-sm font-medium text-[var(--accent-primary)] hover:underline"
        href="/owner/dashboard"
      >
        Back to owner dashboard
      </Link>
    </div>
  );
}
