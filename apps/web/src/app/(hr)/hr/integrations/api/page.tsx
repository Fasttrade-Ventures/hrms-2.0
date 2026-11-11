import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { loadApiKeys } from "@/app/(hr)/hr/integrations/api/actions";
import { ApiKeysPanel } from "@/components/hr/integrations/api-keys-panel";
import { BukucloudSettingsForm } from "@/components/hr/integrations/bukucloud-settings-form";
import { parseDeveloperApiTab } from "@/components/hr/integrations/developer-api-tab";
import { DeveloperApiTabs } from "@/components/hr/integrations/developer-api-tabs";
import { VirtualHirixPanel } from "@/components/hr/integrations/virtual-hirix-panel";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { getEntitlements, requireModule } from "@/lib/entitlements";
import { requireBukucloudIntegrationAccess } from "@/lib/integrations/bukucloud/access";
import { getBukucloudSettings } from "@/lib/integrations/bukucloud/config";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireModule("api");
  await requireRole("hr_administrator", "organization_owner");
  const { tab: rawTab } = await searchParams;
  const tab = parseDeveloperApiTab(rawTab);
  const entitlements = await getEntitlements();

  if (tab === "bukucloud") {
    const canBukucloud = entitlements.hasModule("integrations") && entitlements.hasModule("payroll");
    if (!canBukucloud) redirect("/hr/integrations/api");
  }

  const keys = tab === "api" ? await loadApiKeys() : [];
  const bukucloudSettings =
    tab === "bukucloud" ? await (async () => {
      await requireBukucloudIntegrationAccess();
      return getBukucloudSettings();
    })() : null;

  return (
    <div className="space-y-8">
      <PortalPageHeader
        actions={
          <Link className="text-sm font-medium text-primary" href="/hr/integrations">
            Back to integrations
          </Link>
        }
        description="API keys and partner connections for BukuHR."
        title="Developer API"
      />

      <Suspense fallback={null}>
        <DeveloperApiTabs active={tab} />
      </Suspense>

      {tab === "api" ? (
        <ApiKeysPanel
          baseUrl={`${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/api/v1`}
          keys={keys}
        />
      ) : null}

      {tab === "bukucloud" && bukucloudSettings ? (
        <div className="space-y-6">
          <BukucloudSettingsForm settings={bukucloudSettings} />
          <Card size="sm">
            <CardHeader>
              <CardTitle>How sync works</CardTitle>
              <CardDescription>Payroll totals from BukuHR map to BukuCloud journal lines.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                When you sync a locked or approved payrun, BukuHR sends gross pay, employer statutory
                contributions, combined payables, PCB, and net pay to your BukuCloud tenant.
              </p>
              <p>
                Each payrun uses reference <code className="text-xs">HRMS-{"{payrunId}"}</code> for
                idempotency.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "virtual-hirix" ? (
        <VirtualHirixPanel apiKeysTabHref="/hr/integrations/api" />
      ) : null}
    </div>
  );
}
