import type { SupabaseClient } from "@supabase/supabase-js";

import type { OrganizationCountry } from "@hrms/domain";

/** Reads `organizations.country` for payroll. Missing or unknown values mean Malaysia. */
export async function loadOrganizationCountry(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<OrganizationCountry> {
  try {
    const { data, error } = await supabase
      .from("organizations")
      .select("country")
      .eq("id", organizationId)
      .maybeSingle();

    if (error) {
      if (error.message.includes("country")) return "MY";
      throw new Error(error.message);
    }
    return data?.country === "AU" ? "AU" : "MY";
  } catch {
    return "MY";
  }
}
