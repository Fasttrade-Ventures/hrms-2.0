import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  fetchMalaysiaHolidaysForState,
  planHolidayChanges,
  type FetchedMalaysiaHoliday,
} from "@/lib/hr/malaysia-holidays-api";

export async function persistHolidaySync(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    branchId: string;
    year: number;
    fetched: FetchedMalaysiaHoliday[];
  },
): Promise<{ imported: number; updated: number; skipped: number; error?: string }> {
  const { data: existing, error: existingError } = await supabase
    .from("holidays")
    .select("id, holiday_date, name")
    .eq("organization_id", input.organizationId)
    .eq("branch_id", input.branchId)
    .gte("holiday_date", `${input.year}-01-01`)
    .lte("holiday_date", `${input.year}-12-31`);

  if (existingError) {
    return { imported: 0, updated: 0, skipped: 0, error: existingError.message };
  }

  const plan = planHolidayChanges(
    (existing ?? []).map((row) => ({
      id: row.id as string,
      holidayDate: row.holiday_date as string,
      name: row.name as string,
    })),
    input.fetched,
  );

  if (plan.toInsert.length > 0) {
    const { error: insertError } = await supabase.from("holidays").insert(
      plan.toInsert.map((holiday) => ({
        organization_id: input.organizationId,
        branch_id: input.branchId,
        name: holiday.name,
        holiday_date: holiday.holidayDate,
      })),
    );
    if (insertError) {
      return { imported: 0, updated: 0, skipped: plan.skipped, error: insertError.message };
    }
  }

  if (plan.toUpdate.length > 0) {
    const updateResults = await Promise.all(
      plan.toUpdate.map((holiday) =>
        supabase
          .from("holidays")
          .update({ name: holiday.name })
          .eq("id", holiday.id)
          .eq("organization_id", input.organizationId),
      ),
    );
    const updateError = updateResults.find((result) => result.error)?.error;
    if (updateError) {
      return {
        imported: plan.toInsert.length,
        updated: 0,
        skipped: plan.skipped,
        error: updateError.message,
      };
    }
  }

  return {
    imported: plan.toInsert.length,
    updated: plan.toUpdate.length,
    skipped: plan.skipped,
  };
}

export async function syncBranchesWithState(year: number): Promise<{
  branches: number;
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
}> {
  const admin = createAdminClient();
  const { data: branches, error } = await admin
    .from("branches")
    .select("id, organization_id, state")
    .not("state", "is", null);

  if (error) throw new Error(error.message);

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let counted = 0;

  for (const branch of branches ?? []) {
    const state = String(branch.state ?? "").trim();
    if (!state) continue;
    counted += 1;
    try {
      const fetched = await fetchMalaysiaHolidaysForState(state, year);
      const result = await persistHolidaySync(admin, {
        organizationId: branch.organization_id as string,
        branchId: branch.id as string,
        year,
        fetched,
      });
      if (result.error) {
        failed += 1;
        continue;
      }
      imported += result.imported;
      updated += result.updated;
      skipped += result.skipped;
    } catch (syncError) {
      console.error("State holiday sync failed", branch.id, syncError);
      failed += 1;
    }
  }

  return { branches: counted, imported, updated, skipped, failed };
}
