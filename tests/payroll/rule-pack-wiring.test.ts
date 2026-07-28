import { describe, expect, it } from "vitest";

import {
  buildStatutoryRuleContextFromPacks,
  DEFAULT_STATUTORY_RULES,
  lookupSocsoContribution,
  money,
  SOCSO_CAT1_BANDS,
} from "@hrms/domain";

describe("statutory rule pack wiring", () => {
  it("builds context from seeded DB payload shape", () => {
    const context = buildStatutoryRuleContextFromPacks([
      {
        ruleSet: "perkeso_socso_cat1",
        payload: {
          bands: SOCSO_CAT1_BANDS.map((band) => ({
            maxWage: band.max,
            employee: band.ee,
            employer: band.er,
          })),
        },
      },
      {
        ruleSet: "eis_malaysia",
        payload: { employeeRate: 0.002, employerRate: 0.002, wageCeiling: 6000 },
      },
    ]);

    const fromDb = lookupSocsoContribution(money(7500), "cat1", context);
    const fromDefault = lookupSocsoContribution(money(7500), "cat1", DEFAULT_STATUTORY_RULES);
    expect(fromDb.employee.toNumber()).toBe(fromDefault.employee.toNumber());
    expect(fromDb.employer.toNumber()).toBe(fromDefault.employer.toNumber());
    expect(context.wageCeiling).toBe(6000);
  });

  it("applies custom SOCSO bands from rule pack", () => {
    const context = buildStatutoryRuleContextFromPacks([
      {
        ruleSet: "perkeso_socso_cat1",
        payload: {
          bands: [{ maxWage: 6000, employee: 30, employer: 100 }],
        },
      },
    ]);

    const result = lookupSocsoContribution(money(5000), "cat1", context);
    expect(result.employee.toNumber()).toBe(30);
    expect(result.employer.toNumber()).toBe(100);
  });
});
