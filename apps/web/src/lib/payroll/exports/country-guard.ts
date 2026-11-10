import type { OrganizationCountry } from "@hrms/domain";

import { requireOrganizationId } from "@/lib/auth/organization-context";
import { loadOrganizationCountry } from "@/lib/payroll/organization-country";

export const MALAYSIAN_ONLY_EXPORT_MESSAGE =
  "EPF, SOCSO, PCB, HRDF, CP8D and EA exports are for Malaysian organizations only.";

/** Throws when the country is Australia. Malaysian organizations pass. */
export function assertMalaysianCountry(country: OrganizationCountry): void {
  if (country === "AU") throw new Error(MALAYSIAN_ONLY_EXPORT_MESSAGE);
}

/**
 * Refuses Malaysian statutory and year-end exports for an Australian organization.
 * Call it first in every EPF, SOCSO, PCB, HRDF, CP8D and EA export.
 */
export async function assertMalaysianOrganization(): Promise<void> {
  const { createClient } = await import("@/lib/supabase/server");
  const organizationId = await requireOrganizationId();
  const supabase = await createClient();
  assertMalaysianCountry(await loadOrganizationCountry(supabase, organizationId));
}
