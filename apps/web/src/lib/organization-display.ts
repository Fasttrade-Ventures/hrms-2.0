import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { requireOrganizationId } from "@/lib/auth/organization-context";
import { currencyOrDefault, type DisplayCurrency, type OrganizationDisplay } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

/** Country and currency of the current organization, for server-rendered screens. */
export async function getOrganizationDisplay(): Promise<OrganizationDisplay> {
  // Read the request cookies first so `next build` treats this as a live page.
  // Without a session, standalone mode would throw "DEFAULT_ORGANIZATION_ID is not configured"
  // and fail the production build.
  await cookies();
  const organizationId = await requireOrganizationId();
  const supabase = await createClient();
  const { data } = await supabase
    .from("organizations")
    .select("country, currency")
    .eq("id", organizationId)
    .maybeSingle();

  return {
    country: data?.country === "AU" ? "AU" : "MY",
    currency: currencyOrDefault(data?.currency),
  };
}

/** Currency for messages built in server code. Falls back to MYR if the lookup fails. */
export async function loadOrganizationCurrency(
  client: SupabaseClient,
  organizationId: string,
): Promise<DisplayCurrency> {
  try {
    const { data } = await client
      .from("organizations")
      .select("currency")
      .eq("id", organizationId)
      .maybeSingle();
    return currencyOrDefault(data?.currency);
  } catch {
    return "MYR";
  }
}
