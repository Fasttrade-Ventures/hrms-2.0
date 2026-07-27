/**
 * Seed statutory_rule_versions from domain rule packs.
 *
 * Usage:
 *   set -a && source apps/web/.env.local && set +a
 *   pnpm seed-payroll-rules
 */
import { SOCSO_CAT1_BANDS, SOCSO_CAT2_BANDS } from "@hrms/domain";
import { createClient } from "@supabase/supabase-js";

const EFFECTIVE_FROM = "2024-10-01";

function mapSocsoBands(bands: readonly { max: number; ee: number; er: number }[]) {
  return bands.map((band) => ({
    maxWage: band.max,
    employee: band.ee,
    employer: band.er,
  }));
}

const RULE_PACKS = [
  {
    rule_set: "perkeso_socso_cat1",
    effective_from: EFFECTIVE_FROM,
    source_url: "https://www.perkeso.gov.my/en/rate-of-contribution.html",
    payload: { bands: mapSocsoBands(SOCSO_CAT1_BANDS) },
  },
  {
    rule_set: "perkeso_socso_cat2",
    effective_from: EFFECTIVE_FROM,
    source_url: "https://www.perkeso.gov.my/en/rate-of-contribution.html",
    payload: { bands: mapSocsoBands(SOCSO_CAT2_BANDS) },
  },
  {
    rule_set: "eis_malaysia",
    effective_from: EFFECTIVE_FROM,
    source_url: "https://www.perkeso.gov.my/en/our-services/employer-employee/contributions.html",
    payload: { employeeRate: 0.002, employerRate: 0.002, wageCeiling: 6000 },
  },
  {
    rule_set: "epf_malaysia",
    effective_from: "2025-10-01",
    source_url: "https://www.kwsp.gov.my/en/epf-act-1991-third-schedule",
    payload: { defaultEmployeeRate: 11, defaultEmployerRate: 13 },
  },
  {
    rule_set: "pcb_mtd_malaysia",
    effective_from: "2026-01-01",
    source_url: "https://www.hasil.gov.my/en/employers/employer-payroll-data-specification/",
    payload: { taxYear: 2026, method: "computerised" },
  },
];

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const pack of RULE_PACKS) {
    const { data: existing } = await admin
      .from("statutory_rule_versions")
      .select("id")
      .eq("rule_set", pack.rule_set)
      .eq("effective_from", pack.effective_from)
      .maybeSingle();

    if (existing) {
      console.log(`Skip ${pack.rule_set} (${pack.effective_from}) — already seeded`);
      continue;
    }

    const { error } = await admin.from("statutory_rule_versions").insert({
      rule_set: pack.rule_set,
      effective_from: pack.effective_from,
      source_url: pack.source_url,
      payload: pack.payload,
    });

    if (error) {
      console.error(`${pack.rule_set}:`, error.message);
      process.exit(1);
    }

    console.log(`Seeded ${pack.rule_set} (${pack.effective_from})`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
