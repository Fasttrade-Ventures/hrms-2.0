import { createClient } from "@/lib/supabase/server";

export type LoadedStatutoryRules = {
  ruleSet: string;
  effectiveFrom: string;
  sourceUrl: string | null;
  loaded: boolean;
};

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
  const ruleSets = rules.map((row) => row.ruleSet);

  const hasRule = (predicate: (ruleSet: string) => boolean) => ruleSets.some(predicate);

  const missing: string[] = [];
  if (!hasRule((set) => set.startsWith("epf_"))) missing.push("epf");
  if (!hasRule((set) => set.includes("socso"))) missing.push("socso");
  if (!hasRule((set) => set.includes("eis"))) missing.push("eis");
  if (!hasRule((set) => set.includes("pcb"))) missing.push("pcb");

  if (missing.length > 0) {
    throw new Error(`Missing statutory rule packs for: ${missing.join(", ")}. Run pnpm seed-payroll-rules.`);
  }
}
