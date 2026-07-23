import { describe, expect, it } from "vitest";

import {
  epfContributableWage,
  epfEmployee,
  epfEmployer,
  eisEmployee,
  eisEmployer,
  pcbMtdComputerised,
} from "./malaysia-statutory";
import { money } from "../money";

describe("malaysia statutory scaffold", () => {
  it("EIS at 4000 uses bracket assumed wage", () => {
    expect(eisEmployee(money(4000), true).toNumber()).toBe(7.9);
    expect(eisEmployer(money(4000), true).toNumber()).toBe(7.9);
  });

  it("EPF contributable wage ceil RM50", () => {
    expect(epfContributableWage(money(6955), "ceil_rm50").toNumber()).toBe(7000);
    expect(epfEmployee(money(7000), 12).toNumber()).toBe(840);
    expect(epfEmployer(money(7000), 13).toNumber()).toBe(910);
  });

  it("PCB at 4000 with no YTD", () => {
    const pcb = pcbMtdComputerised(money(4000), money(480), money(0), money(0), money(0), money(0), 1);
    expect(pcb.toNumber()).toBeCloseTo(16.67, 1);
  });

  it("PCB at 8100 August with no YTD", () => {
    const pcb = pcbMtdComputerised(money(8100), money(891), money(0), money(0), money(0), money(0), 8);
    expect(pcb.toNumber()).toBeCloseTo(615.17, 1);
  });
});
