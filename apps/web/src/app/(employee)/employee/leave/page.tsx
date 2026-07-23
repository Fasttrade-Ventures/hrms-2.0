import Link from "next/link";

import { EmptyState } from "@hrms/ui";

import { PortalPageHeader } from "@/components/portal/portal-primitives";

export default function Page() {
  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <button
            className="bg-[var(--accent-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
            type="button"
          >
            Apply leave
          </button>
        }
        description="View balances and submit leave requests."
        title="Leave"
      />

      <EmptyState
        action={
          <button
            className="inline-flex h-11 items-center bg-[var(--accent-primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
            type="button"
          >
            Apply leave
          </button>
        }
        description="Leave application will be available in the next Phase 4 iteration."
        title="No leave requests yet"
      />

      <p className="text-sm text-[var(--foreground-muted)]">
        <Link className="text-[var(--accent-primary)] hover:text-[var(--accent-hover)]" href="/employee/dashboard">
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
