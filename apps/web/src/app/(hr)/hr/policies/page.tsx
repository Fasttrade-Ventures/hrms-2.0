import Link from "next/link";

import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { listPoliciesForHr, publishPolicy } from "@/lib/policies/service";
import { requireRole } from "@/lib/auth/session";

export default async function PoliciesPage() {
  await requireRole("hr_administrator");
  const policies = await listPoliciesForHr();

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="Publish a PDF. Employees must acknowledge each new version."
        title="Policies"
      />

      <form action={publishPolicy} className="space-y-3 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6">
        <h2 className="text-base font-semibold">Publish a policy</h2>
        <label className="block text-sm" htmlFor="title">
          Title
          <input
            className="mt-1 block h-11 w-full border border-[var(--border-primary)] px-3"
            id="title"
            name="title"
            required
          />
        </label>
        <label className="block text-sm" htmlFor="file">
          PDF
          <input accept="application/pdf" className="mt-1 block w-full text-sm" id="file" name="file" required type="file" />
        </label>
        <button className="h-11 bg-[var(--accent-primary)] px-5 text-sm font-medium text-white" type="submit">
          Publish
        </button>
      </form>

      <section className="space-y-4">
        {policies.length === 0 ? <p className="text-sm text-[var(--foreground-muted)]">No policies yet.</p> : null}
        {policies.map((policy) => (
          <article className="space-y-3 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6" key={policy.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">{policy.title}</h2>
                <p className="text-sm text-[var(--foreground-muted)]">
                  Version {policy.version}
                  {policy.fileId ? (
                    <>
                      {" "}
                      · <Link href={`/api/files/${policy.fileId}/download`}>View PDF</Link>
                    </>
                  ) : null}
                </p>
              </div>
              <p className="text-sm">{policy.missingCount} active staff have not acknowledged this version.</p>
            </div>
            {policy.missingNames.length > 0 ? (
              <p className="text-sm text-[var(--foreground-secondary)]">{policy.missingNames.join(", ")}</p>
            ) : (
              <p className="text-sm text-[var(--foreground-muted)]">Everyone active has acknowledged this version.</p>
            )}
            <form action={publishPolicy} className="flex flex-wrap items-end gap-3">
              <input name="policyId" type="hidden" value={policy.id} />
              <input name="title" type="hidden" value={policy.title} />
              <label className="text-sm">
                New PDF version
                <input accept="application/pdf" className="mt-1 block text-sm" name="file" required type="file" />
              </label>
              <button className="h-10 border border-[var(--border-primary)] px-4 text-sm" type="submit">
                Publish version {policy.version + 1}
              </button>
            </form>
          </article>
        ))}
      </section>
    </div>
  );
}
