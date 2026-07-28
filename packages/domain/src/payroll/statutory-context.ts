import { SOCSO_CAT1_BANDS, SOCSO_CAT2_BANDS, type SocsoBand } from "./socso-bands";

export type StatutoryRuleContext = {
  socsoCat1Bands: readonly SocsoBand[];
  socsoCat2Bands: readonly SocsoBand[];
  wageCeiling: number;
  eisEmployeeRate: number;
  eisEmployerRate: number;
};

export const DEFAULT_STATUTORY_RULES: StatutoryRuleContext = {
  socsoCat1Bands: SOCSO_CAT1_BANDS,
  socsoCat2Bands: SOCSO_CAT2_BANDS,
  wageCeiling: 6000,
  eisEmployeeRate: 0.002,
  eisEmployerRate: 0.002,
};

type DbRulePack = {
  ruleSet: string;
  payload: Record<string, unknown>;
};

function mapSocsoBands(payload: Record<string, unknown>): SocsoBand[] {
  const bands = payload.bands;
  if (!Array.isArray(bands)) return [];
  return bands.map((band) => {
    const row = band as { maxWage?: number; max?: number; employee?: number; ee?: number; employer?: number; er?: number };
    return {
      max: Number(row.maxWage ?? row.max ?? 0),
      ee: Number(row.employee ?? row.ee ?? 0),
      er: Number(row.employer ?? row.er ?? 0),
    };
  });
}

/** Merge effective-dated DB rule packs into a runtime calculation context. */
export function buildStatutoryRuleContextFromPacks(packs: DbRulePack[]): StatutoryRuleContext {
  const context: StatutoryRuleContext = { ...DEFAULT_STATUTORY_RULES };

  for (const pack of packs) {
    if (pack.ruleSet.includes("socso_cat1")) {
      const bands = mapSocsoBands(pack.payload);
      if (bands.length > 0) context.socsoCat1Bands = bands;
    }
    if (pack.ruleSet.includes("socso_cat2")) {
      const bands = mapSocsoBands(pack.payload);
      if (bands.length > 0) context.socsoCat2Bands = bands;
    }
    if (pack.ruleSet.includes("eis")) {
      const wageCeiling = Number(pack.payload.wageCeiling);
      if (Number.isFinite(wageCeiling) && wageCeiling > 0) context.wageCeiling = wageCeiling;
      const employeeRate = Number(pack.payload.employeeRate);
      if (Number.isFinite(employeeRate)) context.eisEmployeeRate = employeeRate;
      const employerRate = Number(pack.payload.employerRate);
      if (Number.isFinite(employerRate)) context.eisEmployerRate = employerRate;
    }
  }

  return context;
}
