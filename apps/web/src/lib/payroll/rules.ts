import { createClient } from "@/lib/supabase/server";

export type LoadedStatutoryRules = {
  ruleSet: string;
  effectiveFrom: string;
  sourceUrl: string | null;
  loaded: boolean;
};

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

/** Loads active statutory rule pack metadata for an as-of date. Calculations still use domain tables as fallback. */
export async function loadActiveStatutoryRules(asOf: string): Promise<LoadedStatutoryRules[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("statutory_rule_versions")
    .select("rule_set, effective_from, source_url")
    .lte("effective_from", asOf)
    .or(`effective_to.is.null,effective_to.gte.${asOf}`)
    .order("effective_from", { ascending: false });

  if (error) throw new Error(error.message);

  const seen = new Set<string>();
  const rules: LoadedStatutoryRules[] = [];
  for (const row of data ?? []) {
    if (seen.has(row.rule_set)) continue;
    seen.add(row.rule_set);
    rules.push({
      ruleSet: row.rule_set,
      effectiveFrom: row.effective_from,
      sourceUrl: row.source_url,
      loaded: true,
    });
  }
  return rules;
}

export async function assertStatutoryRulesAvailable(asOf: string): Promise<void> {
  const rules = await loadActiveStatutoryRules(asOf);
  const required = ["epf", "socso", "eis", "pcb"];
  const missing = required.filter((set) => !rules.some((row) => row.ruleSet === set));
  if (missing.length > 0) {
    throw new Error(`Missing statutory rule packs for: ${missing.join(", ")}. Run pnpm seed-payroll-rules.`);
  }
}
