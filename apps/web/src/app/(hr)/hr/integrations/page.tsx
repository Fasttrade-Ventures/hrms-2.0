import Link from "next/link";

import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";

export default async function Page() {
  await requireModule("integrations");
  await requireRole("hr_administrator");

  const cards = [
    { href: "/hr/integrations/webhooks", title: "Webhooks", description: "Outbound HR lifecycle events with HMAC signing." },
    { href: "/hr/integrations/api", title: "API keys", description: "REST API keys for employees, leave, and payroll read access." },
    { href: "/hr/integrations/bukucloud", title: "BukuCloud", description: "Sync locked payruns to BukuCloud accounting." },
  ];

  return (
    <div className="space-y-8">
      <PortalPageHeader description="Connect HRMS to external systems." title="Integrations" />
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Link
            className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-card)] p-5 hover:bg-[var(--surface-muted)]"
            href={card.href}
            key={card.href}
          >
            <h2 className="font-semibold">{card.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
