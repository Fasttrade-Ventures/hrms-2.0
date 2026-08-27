"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { switchOrganizationAction } from "@/lib/auth/switch-organization";

export type OrgSwitcherOption = {
  organizationId: string;
  name: string;
};

export function OrganizationSwitcher({
  options,
  activeOrganizationId,
}: {
  options: OrgSwitcherOption[];
  activeOrganizationId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (options.length < 2) return null;

  return (
    <label className="hidden items-center gap-2 text-xs text-[var(--foreground-muted)] md:flex">
      <span className="sr-only">Organization</span>
      <select
        aria-label="Switch organization"
        className="max-w-[180px] truncate rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface-primary)] px-2 py-1.5 text-[13px] text-[var(--foreground-primary)]"
        disabled={pending}
        onChange={(event) => {
          const nextId = event.target.value;
          if (!nextId || nextId === activeOrganizationId) return;
          startTransition(async () => {
            const result = await switchOrganizationAction(nextId);
            if (!result.error) router.refresh();
          });
        }}
        value={activeOrganizationId}
      >
        {options.map((option) => (
          <option key={option.organizationId} value={option.organizationId}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}
