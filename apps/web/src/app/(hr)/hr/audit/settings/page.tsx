import Link from "next/link";

import { formatDateTime } from "@/components/employee/employee-shared";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { AuditSettingsForms } from "@/components/hr/audit/audit-settings-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuditAccess } from "@/lib/audit/access";
import { getAuditSettings } from "@/lib/audit/settings";
import { getEntitlements } from "@/lib/entitlements";

export default async function Page() {
  await requireAuditAccess();
  const [settings, entitlements] = await Promise.all([getAuditSettings(), getEntitlements()]);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <Link
            className="text-sm font-medium text-[var(--accent-primary)] hover:underline"
            href="/hr/audit"
          >
            Back to audit log
          </Link>
        }
        description="Retention, cold storage archive, and enterprise SIEM forwarding."
        title="Audit settings"
      />

      <AuditSettingsForms integrationsEnabled={entitlements.hasModule("integrations")} settings={settings} />

      <Card size="sm">
        <CardHeader>
          <CardTitle>Recent archives</CardTitle>
          <CardDescription>
            Cold storage exports created by the weekly archive job when archiving is enabled.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {settings.archives.length === 0 ? (
            <p className="text-sm text-muted-foreground">No archives yet.</p>
          ) : (
            settings.archives.map((archive) => (
              <div
                className="rounded-md border border-[var(--border-primary)] px-3 py-2 text-sm"
                key={archive.id}
              >
                <p className="font-medium">
                  {archive.eventCount} events · {formatDateTime(archive.periodStart)} →{" "}
                  {formatDateTime(archive.periodEnd)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Archived {formatDateTime(archive.createdAt)}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
