import Link from "next/link";

import { BukucloudSettingsForm } from "@/components/hr/integrations/bukucloud-settings-form";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireBukucloudIntegrationAccess } from "@/lib/integrations/bukucloud/access";
import { getBukucloudSettings } from "@/lib/integrations/bukucloud/config";

export default async function BukucloudIntegrationPage() {
  await requireBukucloudIntegrationAccess();
  const settings = await getBukucloudSettings();

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <Link
            className="text-sm font-medium text-[var(--accent-primary)] hover:underline"
            href="/hr/payroll"
          >
            Back to payroll
          </Link>
        }
        description="Post approved payruns to BukuCloud as balanced payroll journal entries."
        title="BukuCloud integration"
      />

      <BukucloudSettingsForm settings={settings} />

      <Card size="sm">
        <CardHeader>
          <CardTitle>How sync works</CardTitle>
          <CardDescription>Payroll totals from HRMS map to BukuCloud journal lines.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            When you sync a locked or approved payrun, HRMS sends gross pay, employer statutory contributions,
            combined payables (employee + employer), PCB, and net pay to{" "}
            <code className="text-xs">POST /api/v1/payroll</code> on your tenant.
          </p>
          <p>
            Each payrun uses reference <code className="text-xs">HRMS-{"{payrunId}"}</code> for idempotency.
            Re-sync is skipped unless you force a retry from the payrun detail page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
