import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { AuditLogPanel } from "@/components/hr/audit/audit-log-panel";
import { requireAuditAccess } from "@/lib/audit/access";
import { listAuditEvents } from "@/lib/audit/queries";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    action?: string;
    resourceType?: string;
    from?: string;
    to?: string;
    cursor?: string;
  }>;
}) {
  await requireAuditAccess();
  const params = await searchParams;
  const { events, nextCursor } = await listAuditEvents({
    action: params.action,
    resourceType: params.resourceType,
    from: params.from,
    to: params.to,
    cursor: params.cursor,
  }).catch(() => ({ events: [], nextCursor: null }));

  const exportQuery = new URLSearchParams();
  if (params.action) exportQuery.set("action", params.action);
  if (params.resourceType) exportQuery.set("resourceType", params.resourceType);
  if (params.from) exportQuery.set("from", params.from);
  if (params.to) exportQuery.set("to", params.to);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="Read-only audit trail for compliance review. Export filtered results as CSV."
        title="Audit log"
      />

      <AuditLogPanel
        basePath="/auditor/audit"
        events={events}
        exportHref={`/api/hr/audit/export?${exportQuery.toString()}`}
        filters={{
          action: params.action,
          resourceType: params.resourceType,
          from: params.from,
          to: params.to,
        }}
        nextCursor={nextCursor}
      />
    </div>
  );
}
