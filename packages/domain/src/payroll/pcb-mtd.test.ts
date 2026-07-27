import { describe, expect, it } from "vitest";

import { money } from "../money";
import { pcbMtdFull } from "./pcb-mtd";

const zeroTp1 = { spouse: money(0), children: money(0), other: money(0), zakatAnnual: money(0) };
const zeroYtd = { gross: money(0), epf: money(0), pcb: money(0) };

describe("pcbMtdFull", () => {
  it("matches golden case pcb-4000-no-ytd", () => {
    const pcb = pcbMtdFull({
      frequency: "monthly",
      periodGross: money(4000),
      periodEpf: money(480),
      tp1: zeroTp1,
      ytd: zeroYtd,
      asOf: "2026-01-15",
      ceil5Sen: false,
    });
    expect(pcb.toNumber()).toBeCloseTo(16.67, 1);
  });

  it("reduces PCB when zakat is declared on TP1", () => {
    const without = pcbMtdFull({
      frequency: "monthly",
      periodGross: money(8000),
      periodEpf: money(880),
      tp1: zeroTp1,
      ytd: zeroYtd,
      asOf: "2026-01-15",
    });
    const withZakat = pcbMtdFull({
      frequency: "monthly",
      periodGross: money(8000),
      periodEpf: money(880),
      tp1: { ...zeroTp1, zakatAnnual: money(1200) },
      ytd: zeroYtd,
      asOf: "2026-01-15",
    });
    expect(withZakat.lt(without)).toBe(true);
  });

  it("waives PCB when married income after EPF is below RM3851", () => {
    const pcb = pcbMtdFull({
      frequency: "monthly",
      periodGross: money(4000),
      periodEpf: money(440),
      tp1: { ...zeroTp1, children: money(4000) },
      ytd: zeroYtd,
      asOf: "2026-06-15",
      maritalCategory: "married",
      ceil5Sen: false,
    });
    expect(pcb.toNumber()).toBe(0);
  });

  it("reduces PCB when SOCSO and EIS are annual reliefs", () => {
    const without = pcbMtdFull({
      frequency: "monthly",
      periodGross: money(8000),
      periodEpf: money(880),
      tp1: zeroTp1,
      ytd: zeroYtd,
      asOf: "2026-01-15",
      ceil5Sen: false,
    });
    const withStatutory = pcbMtdFull({
      frequency: "monthly",
      periodGross: money(8000),
      periodEpf: money(880),
      periodSocso: money(50),
      periodEis: money(8),
      tp1: zeroTp1,
      ytd: zeroYtd,
      asOf: "2026-01-15",
      ceil5Sen: false,
    });
    expect(withStatutory.lt(without)).toBe(true);
  });

  it("supports weekly pay frequency", () => {
    const pcb = pcbMtdFull({
      frequency: "weekly",
      periodGross: money(3500),
      periodEpf: money(385),
      tp1: zeroTp1,
      ytd: zeroYtd,
      asOf: "2026-01-15",
      maritalCategory: "single",
    });
    expect(pcb.toNumber()).toBeGreaterThan(0);
  });
});
