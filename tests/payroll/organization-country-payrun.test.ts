import { describe, expect, it, vi } from "vitest";

import { money } from "@hrms/domain";

import { computeEmployeePayrunFromRows } from "@/lib/payroll/build-compute-input";
import { loadOrganizationCountry } from "@/lib/payroll/organization-country";

const lines = [
  {
    code: "BASIC",
    amount: money(5000),
    flags: { isEpf: true, isSocso: true, isEis: true, isPcb: true, isHrdf: true },
  },
];

const baseRows = {
  lines,
  dependents: [],
  frequency: "monthly" as const,
  asOf: "2026-11-30",
  branch: { hrdf_enabled: true },
};

describe("organization country threads into the payrun", () => {
  it("keeps Malaysian statutory when country is omitted", () => {
    const result = computeEmployeePayrunFromRows(baseRows);
    expect(result.epfEmployee.toNumber()).toBeGreaterThan(0);
    expect(result.socsoEmployee.toNumber()).toBeGreaterThan(0);
    expect(result.hrdfEmployer.toNumber()).toBeGreaterThan(0);
  });

  it("has no EPF, SOCSO, EIS, PCB or HRDF for an Australian organization", () => {
    const result = computeEmployeePayrunFromRows({ ...baseRows, country: "AU" });
    expect(result.gross.toNumber()).toBe(5000);
    expect(result.epfEmployee.toNumber()).toBe(0);
    expect(result.socsoEmployee.toNumber()).toBe(0);
    expect(result.eisEmployee.toNumber()).toBe(0);
    expect(result.pcb.toNumber()).toBe(0);
    expect(result.hrdfEmployer.toNumber()).toBe(0);
  });
});

function clientReturning(result: { data: unknown; error: unknown }) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  return { client: { from } as never, from, select, eq };
}

describe("loadOrganizationCountry", () => {
  it("reads organizations.country", async () => {
    const { client, from, select } = clientReturning({ data: { country: "AU" }, error: null });
    await expect(loadOrganizationCountry(client, "org-1")).resolves.toBe("AU");
    expect(from).toHaveBeenCalledWith("organizations");
    expect(select).toHaveBeenCalledWith("country");
  });

  it("treats a missing or unknown country as MY", async () => {
    expect(
      await loadOrganizationCountry(clientReturning({ data: null, error: null }).client, "org-1"),
    ).toBe("MY");
    expect(
      await loadOrganizationCountry(
        clientReturning({ data: { country: "SG" }, error: null }).client,
        "org-1",
      ),
    ).toBe("MY");
  });
});
