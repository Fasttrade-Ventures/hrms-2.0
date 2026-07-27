import { money, type Money } from "../money";

/** LHDN resident annual relief amounts (YA 2026). */
export const LHDN_ANNUAL_RELIEFS = {
  individual: 9000,
  spouseNotWorking: 4000,
  childPerDependent: 2000,
} as const;

export type Tp1ReliefProfile = {
  maritalStatus: string | null | undefined;
  spouseWorking: boolean | null | undefined;
  childCount: number;
};

export function computeTp1AnnualReliefs(profile: Tp1ReliefProfile): {
  spouse: Money;
  children: Money;
} {
  const married = profile.maritalStatus === "married";
  const spouse =
    married && profile.spouseWorking === false
      ? money(LHDN_ANNUAL_RELIEFS.spouseNotWorking)
      : money(0);
  const children = money(
    Math.max(0, profile.childCount) * LHDN_ANNUAL_RELIEFS.childPerDependent,
  );
  return { spouse, children };
}
