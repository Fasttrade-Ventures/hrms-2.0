import Link from "next/link";

import { HrLinkButton } from "@/components/hr/hr-ui.client";
import { CreatePayrunWizard } from "@/components/hr/payroll/create-payrun-wizard";
import { PortalSectionCard } from "@/components/portal/portal-section";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";
import { listPayGroups } from "@/lib/payroll/queries";

export default async function NewPayrunPage() {
  await requireModule("payroll");
  await requireRole("hr_administrator");
  const payGroups = await listPayGroups().catch(() => []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PortalPageHeader
        actions={
          <HrLinkButton href="/hr/payroll" variant="outline">
            Back to payroll
          </HrLinkButton>
        }
        description="Configure scope, earning period, and pay date. Statutory amounts are computed from the domain pipeline."
        title="Create payrun"
      />

      <PortalSectionCard title="Payrun setup">
        <CreatePayrunWizard payGroups={payGroups} />
      </PortalSectionCard>

      {payGroups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No pay groups configured. Use organisation-wide scope, or set up pay groups under organisation
          settings.
        </p>
      ) : null}

      <p className="text-sm text-muted-foreground">
        After generation you can review lines, submit for review, approve, and lock.{" "}
        <Link className="text-[var(--accent-primary)]" href="/hr/payroll">
          View existing payruns
        </Link>
      </p>
    </div>
  );
}
