import Link from "next/link";

import { StatusPill } from "@hrms/ui";

import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireRole } from "@/lib/auth/session";
import { getEntitlements } from "@/lib/entitlements";

type IntegrationCard = {
  href: string;
  title: string;
  description: string;
  tier: string;
  enabled: boolean;
};

export default async function IntegrationsHubPage() {
  await requireRole("hr_administrator");
  const entitlements = await getEntitlements();

  const hasIntegrations = entitlements.hasModule("integrations");
  const hasApi = entitlements.hasModule("api");
  const hasPayroll = entitlements.hasModule("payroll");
  const hasAudit = entitlements.hasModule("audit");

  const cards: IntegrationCard[] = [
    {
      href: "/hr/integrations/webhooks",
      title: "Webhooks",
      description: "Outbound HR lifecycle events (leave, employee, payroll) with HMAC signing.",
      tier: "Enterprise",
      enabled: hasIntegrations,
    },
    {
      href: "/hr/integrations/api",
      title: "API keys",
      description: "REST API access for employees, leave requests, and payroll read endpoints.",
      tier: "Enterprise",
      enabled: hasApi,
    },
    {
      href: "/hr/integrations/bukucloud",
      title: "BukuCloud",
      description: "Sync locked payruns to BukuCloud as balanced payroll journal entries.",
      tier: "Enterprise + Payroll",
      enabled: hasIntegrations && hasPayroll,
    },
    {
      href: "/hr/audit/settings",
      title: "SIEM forwarding",
      description: "Forward audit log events to your security stack via signed webhook.",
      tier: "Enterprise",
      enabled: hasAudit && hasIntegrations,
    },
  ];

  if (!hasIntegrations && !hasApi) {
    return (
      <div className="space-y-6">
        <PortalPageHeader
          description="Connect HRMS to external systems, accounting, and security tools."
          title="Integrations"
        />
        <p className="rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--foreground-secondary)]">
          Integrations are available on the Enterprise plan. Upgrade your organization tier or
          enable the integrations module in owner settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PortalPageHeader
        description="All external connections — webhooks, API, accounting sync, and security forwarding."
        title="Integrations"
      />

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) =>
          card.enabled ? (
            <Link
              className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-card)] p-5 transition-colors hover:bg-[var(--surface-muted)]"
              href={card.href}
              key={card.href}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold text-[var(--foreground-primary)]">{card.title}</h2>
                <StatusPill label="Active" tone="success" />
              </div>
              <p className="mt-2 text-sm text-[var(--foreground-secondary)]">{card.description}</p>
              <p className="mt-3 text-xs text-[var(--foreground-muted)]">{card.tier}</p>
            </Link>
          ) : (
            <div
              className="rounded-xl border border-dashed border-[var(--border-primary)] bg-[var(--surface-muted)]/50 p-5 opacity-80"
              key={card.href}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold text-[var(--foreground-primary)]">{card.title}</h2>
                <StatusPill label="Upgrade" tone="neutral" />
              </div>
              <p className="mt-2 text-sm text-[var(--foreground-secondary)]">{card.description}</p>
              <p className="mt-3 text-xs text-[var(--foreground-muted)]">Requires {card.tier}</p>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
