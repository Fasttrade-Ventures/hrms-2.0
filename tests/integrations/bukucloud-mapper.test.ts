import { describe, expect, it } from "vitest";

import { buildBukucloudReference, mapPayrunToBukucloudPayload } from "@/lib/integrations/bukucloud/mapper";

describe("bukucloud payroll mapper", () => {
  const totals = {
    gross: 10000,
    epfEmployee: 1100,
    epfEmployer: 1300,
    socsoEmployee: 50,
    socsoEmployer: 80,
    eisEmployee: 10,
    eisEmployer: 10,
    pcb: 500,
    hrdfEmployer: 100,
    net: 8340,
  };

  it("builds a stable HRMS reference from payrun id", () => {
    expect(buildBukucloudReference("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe("HRMS-A1B2C3D4");
  });

  it("maps payrun totals to balanced bukucloud payload", () => {
    const payload = mapPayrunToBukucloudPayload({
      payrunId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      payDate: "2026-07-28",
      periodLabel: "2026-07",
      bankAccountCode: "1000",
      totals,
    });

    expect(payload.reference_number).toBe("HRMS-A1B2C3D4");
    expect(payload.bank_account_code).toBe("1000");
    expect(payload.gross_salaries).toBe(10000);
    expect(payload.epf_payable).toBe(2400);
    expect(payload.socso_payable).toBe(130);
    expect(payload.eis_payable).toBe(20);
    expect(payload.pcb_payable).toBe(500);
    expect(payload.net_pay).toBe(8340);

    const debits =
      payload.gross_salaries +
      (payload.employer_epf ?? 0) +
      (payload.employer_socso ?? 0) +
      (payload.employer_eis ?? 0) +
      (payload.employer_hrd ?? 0);
    const credits =
      (payload.epf_payable ?? 0) +
      (payload.socso_payable ?? 0) +
      (payload.eis_payable ?? 0) +
      (payload.pcb_payable ?? 0) +
      (payload.hrd_payable ?? 0) +
      payload.net_pay;

    expect(debits).toBe(credits);
  });
});
