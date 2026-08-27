"use client";

import { useTransition } from "react";

import { updateTenantTierAction } from "@/app/(platform)/platform/actions";
import type { ProductTier } from "@hrms/platform";

const TIERS: ProductTier[] = ["core", "professional", "enterprise"];

export function TenantTierSelect({
  organizationId,
  currentTier,
}: {
  organizationId: string;
  currentTier: ProductTier;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      aria-label="Product tier"
      className="rounded border border-[var(--border-primary)] bg-[var(--surface-primary)] px-2 py-1 text-sm capitalize"
      disabled={pending}
      onChange={(event) => {
        const tier = event.target.value as ProductTier;
        if (tier === currentTier) return;
        const formData = new FormData();
        formData.set("organizationId", organizationId);
        formData.set("tier", tier);
        startTransition(() => updateTenantTierAction(formData));
      }}
      value={currentTier}
    >
      {TIERS.map((tier) => (
        <option key={tier} value={tier}>
          {tier}
        </option>
      ))}
    </select>
  );
}
