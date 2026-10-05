import Link from "next/link";

import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { acknowledgePolicy, listPoliciesForEmployee } from "@/lib/policies/service";

export default async function EmployeePoliciesPage() {
  const policies = await listPoliciesForEmployee();

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="Read each company policy and confirm the current version."
        title="Policies"
      />

      {policies.length === 0 ? (
        <p className="text-sm text-[var(--foreground-muted)]">No policies to acknowledge.</p>
      ) : null}

      <div className="space-y-4">
        {policies.map((policy) => (
          <article className="space-y-3 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6" key={policy.id}>
            <h2 className="text-base font-semibold">{policy.title}</h2>
            <p className="text-sm text-[var(--foreground-muted)]">Version {policy.version}</p>
            {policy.fileId ? (
              <Link className="text-sm underline" href={`/api/files/${policy.fileId}/download`}>
                Read PDF
              </Link>
            ) : null}
            {policy.acknowledged ? (
              <p className="text-sm">You have acknowledged this version.</p>
            ) : (
              <form action={acknowledgePolicy}>
                <input name="policyId" type="hidden" value={policy.id} />
                <button className="h-11 bg-[var(--accent-primary)] px-5 text-sm font-medium text-white" type="submit">
                  I have read this version
                </button>
              </form>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
