import { computeTp1AnnualReliefs } from "@hrms/domain";

type TaxProfileRow = {
  marital_status?: string | null;
  spouse_working?: boolean | null;
  zakat_annual?: number | string | null;
  zakat_monthly?: number | string | null;
  tp1_payload?: { otherReliefs?: number } | null;
} | null;

type ProfileRow = {
  marital_status?: string | null;
} | null;

type DependentRow = {
  dependent_type?: string | null;
};

export function buildTp1InputFromEmployeeData(input: {
  taxProfile?: TaxProfileRow;
  profile?: ProfileRow;
  dependents?: DependentRow[] | null;
}) {
  const taxProfile = input.taxProfile;
  const profile = input.profile;
  const dependents = input.dependents ?? [];
  const childCount = dependents.filter((row) => row.dependent_type === "child").length;
  const maritalStatus = taxProfile?.marital_status ?? profile?.marital_status ?? null;
  const tp1Payload = (taxProfile?.tp1_payload ?? {}) as { otherReliefs?: number };
  const annualReliefs = computeTp1AnnualReliefs({
    maritalStatus,
    spouseWorking: taxProfile?.spouse_working ?? null,
    childCount,
  });

  return {
    maritalStatus,
    spouseWorking: taxProfile?.spouse_working ?? null,
    childCount,
    maritalCategory: maritalStatus === "married" ? ("married" as const) : ("single" as const),
    tp1: {
      zakatAnnual: String(taxProfile?.zakat_annual ?? 0),
      zakatMonthly: String(taxProfile?.zakat_monthly ?? 0),
      spouse: annualReliefs.spouse,
      children: annualReliefs.children,
      otherReliefs: Number(tp1Payload.otherReliefs ?? 0),
    },
  };
}
