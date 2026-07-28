"use client";

import { impersonateTenantAction, stopImpersonationAction } from "@/app/(platform)/platform/actions";
import { Button } from "@/components/ui/button";

export function ImpersonationBanner({
  organizationName,
}: {
  organizationName: string;
}) {
  return (
    <div className="border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-950">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <p>
          Impersonating <strong>{organizationName}</strong> as organization owner.
        </p>
        <form action={stopImpersonationAction}>
          <Button size="sm" type="submit" variant="outline">
            Exit impersonation
          </Button>
        </form>
      </div>
    </div>
  );
}

export function ImpersonateTenantButton({ organizationId }: { organizationId: string }) {
  return (
    <form action={impersonateTenantAction}>
      <input name="organizationId" type="hidden" value={organizationId} />
      <Button size="sm" type="submit" variant="outline">
        Enter as owner
      </Button>
    </form>
  );
}
