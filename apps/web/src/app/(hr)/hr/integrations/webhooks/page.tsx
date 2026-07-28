import Link from "next/link";

import { WebhookEndpointForm } from "@/components/hr/integrations/webhook-endpoint-form";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { PortalSectionCard } from "@/components/portal/portal-section";
import { listWebhookDeliveryLog, listWebhookEndpoints } from "@/lib/integrations/webhooks/queries";
import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";

export default async function Page() {
  await requireModule("integrations");
  await requireRole("hr_administrator");

  const [endpoints, deliveries] = await Promise.all([
    listWebhookEndpoints(),
    listWebhookDeliveryLog(),
  ]);

  return (
    <div className="space-y-8">
      <PortalPageHeader
        actions={
          <Link className="text-sm font-medium text-primary" href="/hr/integrations">
            Back to integrations
          </Link>
        }
        description="Register webhook endpoints for HR lifecycle events."
        title="Webhooks"
      />

      <PortalSectionCard title="Add endpoint">
        <WebhookEndpointForm />
      </PortalSectionCard>

      <PortalSectionCard title="Registered endpoints">
        <ul className="space-y-3 text-sm">
          {endpoints.map((endpoint) => (
            <li className="rounded-lg border p-3" key={endpoint.id}>
              <p className="font-medium">{endpoint.name}</p>
              <p className="text-muted-foreground">{endpoint.url}</p>
              <p className="text-xs text-muted-foreground">
                {(endpoint.events_filter ?? []).join(", ") || "All subscribed events"}
              </p>
            </li>
          ))}
          {endpoints.length === 0 ? <p className="text-muted-foreground">No endpoints yet.</p> : null}
        </ul>
      </PortalSectionCard>

      <PortalSectionCard title="Recent deliveries">
        <ul className="space-y-2 text-sm">
          {deliveries.map((row) => (
            <li className="flex justify-between gap-4" key={row.id}>
              <span>{row.event_type}</span>
              <span className="text-muted-foreground">{row.status}</span>
            </li>
          ))}
        </ul>
      </PortalSectionCard>
    </div>
  );
}
