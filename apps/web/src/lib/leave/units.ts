import type { SupabaseClient } from "@supabase/supabase-js";

export type LeaveUnits = {
  country: "MY" | "AU";
  /** Hours in a standard working day. Australia enters and shows hours; Malaysia stays on days. */
  standardDayHours: number;
};

export const DEFAULT_AU_STANDARD_DAY_HOURS = 7.6;

/** Reads country and standard_day_hours from the organization. Unknown values mean Malaysia. */
export async function loadLeaveUnits(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<LeaveUnits> {
  const { data, error } = await supabase
    .from("organizations")
    .select("country, standard_day_hours")
    .eq("id", organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const country = data?.country === "AU" ? "AU" : "MY";
  const stored = Number(data?.standard_day_hours);
  const standardDayHours =
    Number.isFinite(stored) && stored > 0
      ? stored
      : country === "AU"
        ? DEFAULT_AU_STANDARD_DAY_HOURS
        : 8;

  return { country, standardDayHours };
}
