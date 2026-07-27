import { PayrollComponentsList } from "@/components/hr/payroll/payroll-components-list";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";
import { listPayrollComponents } from "@/lib/payroll/settings";

export default async function PayrollComponentsPage() {
  requireModule("payroll");
  await requireRole("hr_administrator");
  const components = await listPayrollComponents();

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="Seeded Malaysian payroll component catalog for your organization."
        title="Payroll components"
      />
      <PayrollComponentsList components={components} />
    </div>
  );
}
