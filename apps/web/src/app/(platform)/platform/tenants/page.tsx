import { EmptyState } from "@hrms/ui";
import { isSaasMode } from "@hrms/platform";
import { redirect } from "next/navigation";

import { ImpersonateTenantButton } from "@/components/platform/impersonation-controls";
import { ProvisionTenantForm } from "@/components/platform/provision-tenant-form";
import { TenantTierSelect } from "@/components/platform/tenant-tier-select";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireRole } from "@/lib/auth/session";
import { listTenants } from "@/lib/platform/tenants";

export default async function Page() {
  await requireRole("platform_administrator");
  if (!isSaasMode()) {
    redirect("/platform/dashboard");
  }
  const tenants = await listTenants();

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="Provision new tenants and enter an organization as its owner for support."
        title="Tenants"
      />

      <ProvisionTenantForm />

      <div className="overflow-hidden rounded-lg border border-[var(--border-primary)] bg-[var(--surface-card)]">
        <div className="border-b border-[var(--border-primary)] px-4 py-3">
          <p className="text-sm font-medium text-[var(--foreground-primary)]">All tenants</p>
        </div>
        {tenants.length === 0 ? (
          <div className="p-6">
            <EmptyState description="Provision your first tenant using the form above." title="No tenants yet" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Organization</th>
                  <th className="px-4 py-3 font-medium">Slug</th>
                  <th className="px-4 py-3 font-medium">Tier</th>
                  <th className="px-4 py-3 font-medium">Subscription</th>
                  <th className="px-4 py-3 font-medium">Employees</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr className="border-b" key={tenant.id}>
                    <td className="px-4 py-3 font-medium">{tenant.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{tenant.slug ?? "—"}</td>
                    <td className="px-4 py-3 capitalize">
                      <TenantTierSelect currentTier={tenant.productTier} organizationId={tenant.id} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {tenant.subscriptionStatus
                        ? `${tenant.subscriptionStatus.replace("_", " ")}${tenant.billingInterval ? ` · ${tenant.billingInterval}` : ""}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">{tenant.employeeCount}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(tenant.createdAt).toLocaleDateString("en-MY")}
                    </td>
                    <td className="px-4 py-3">
                      <ImpersonateTenantButton organizationId={tenant.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
