import { describe, expect, it } from "vitest";

import {
  auLeaveEarningName,
  buildAuPayFileCsv,
  mapAuPayFileLines,
  type AuPayFileLine,
} from "./au-pay-file";

const HEADER =
  "employee_number,employee_name,period_start,period_end,earning_name,hours,rate,amount";

const base = {
  employeeNumber: "E001",
  employeeName: "Jane Citizen",
  periodStart: "2026-11-01",
  periodEnd: "2026-11-14",
};

describe("buildAuPayFileCsv", () => {
  it("writes 7.6 ordinary hours at rate 30 as 228.00", () => {
    const csv = buildAuPayFileCsv([
      { ...base, earningName: "Ordinary", hours: 7.6, rate: 30, amount: 0 },
    ]);
    expect(csv.split("\n")).toEqual([
      HEADER,
      "E001,Jane Citizen,2026-11-01,2026-11-14,Ordinary,7.6,30,228.00",
    ]);
  });

  it("computes amount from hours and rate for hourly earnings", () => {
    const line: AuPayFileLine = {
      ...base,
      earningName: "Overtime",
      hours: 2,
      rate: 45.555,
      amount: 999,
    };
    expect(buildAuPayFileCsv([line]).split("\n")[1]).toBe(
      "E001,Jane Citizen,2026-11-01,2026-11-14,Overtime,2,45.555,91.11",
    );
  });

  it("throws on a blank employee number", () => {
    expect(() =>
      buildAuPayFileCsv([
        { ...base, employeeNumber: "  ", earningName: "Ordinary", hours: 1, rate: 30, amount: 30 },
      ]),
    ).toThrow(/employee number/i);
  });

  it("leaves hours and rate cells empty for an allowance", () => {
    const csv = buildAuPayFileCsv([
      { ...base, earningName: "Allowance", hours: null, rate: null, amount: 50 },
    ]);
    expect(csv.split("\n")[1]).toBe("E001,Jane Citizen,2026-11-01,2026-11-14,Allowance,,,50.00");
  });

  it("quotes a field that contains a comma", () => {
    const csv = buildAuPayFileCsv([
      {
        ...base,
        employeeName: "Citizen, Jane",
        earningName: "Allowance",
        hours: null,
        rate: null,
        amount: 10,
      },
    ]);
    expect(csv.split("\n")[1]).toBe(
      'E001,"Citizen, Jane",2026-11-01,2026-11-14,Allowance,,,10.00',
    );
  });

  it("returns only the header for no lines", () => {
    expect(buildAuPayFileCsv([])).toBe(HEADER);
  });
});

describe("auLeaveEarningName", () => {
  it.each([
    ["Personal Leave", "Personal leave"],
    ["Sick leave", "Personal leave"],
    ["CARER'S leave", "Personal leave"],
    ["Annual Leave", "Annual leave"],
    ["Long service", "Annual leave"],
  ])("maps %s to %s", (name, expected) => {
    expect(auLeaveEarningName(name)).toBe(expected);
  });
});

describe("mapAuPayFileLines", () => {
  const period = { periodStart: "2026-11-01", periodEnd: "2026-11-14", standardDayHours: 7.6 };
  const employees = [
    { id: "e1", employeeNumber: "E001", fullName: "Jane Citizen", hourlyRate: 30 },
    { id: "e2", employeeNumber: "E002", fullName: "No Rate", hourlyRate: null },
  ];

  it("turns a closed 7.6 hour session into an Ordinary line and skips open sessions", () => {
    const lines = mapAuPayFileLines({
      ...period,
      employees,
      sessions: [
        { employeeId: "e1", clockInAt: "2026-11-03T08:00:00.000Z", clockOutAt: "2026-11-03T15:36:00.000Z" },
        { employeeId: "e1", clockInAt: "2026-11-04T08:00:00.000Z", clockOutAt: null },
      ],
      overtime: [],
      leave: [],
      allowances: [],
    });
    expect(lines).toEqual([
      { ...base, earningName: "Ordinary", hours: 7.6, rate: 30, amount: 228 },
    ]);
  });

  it("skips an employee without an hourly rate", () => {
    const lines = mapAuPayFileLines({
      ...period,
      employees,
      sessions: [
        { employeeId: "e2", clockInAt: "2026-11-03T08:00:00.000Z", clockOutAt: "2026-11-03T16:00:00.000Z" },
      ],
      overtime: [{ employeeId: "e2", hours: 2, rateType: "1.5", hourlyRate: null }],
      leave: [{ employeeId: "e2", days: 1, leaveTypeName: "Annual leave", isUnpaid: false }],
      allowances: [{ employeeId: "e2", amount: 20 }],
    });
    expect(lines).toEqual([]);
  });

  it("uses the stored request rate, else hourly rate times multiplier", () => {
    const lines = mapAuPayFileLines({
      ...period,
      employees,
      sessions: [],
      overtime: [
        { employeeId: "e1", hours: 2, rateType: "1.5", hourlyRate: null },
        { employeeId: "e1", hours: 1, rateType: "2.0", hourlyRate: 70 },
      ],
      leave: [],
      allowances: [],
    });
    expect(lines).toEqual([
      { ...base, earningName: "Overtime", hours: 2, rate: 45, amount: 90 },
      { ...base, earningName: "Overtime", hours: 1, rate: 70, amount: 70 },
    ]);
  });

  it("converts paid leave days to hours, maps names, and omits unpaid leave", () => {
    const lines = mapAuPayFileLines({
      ...period,
      employees,
      sessions: [],
      overtime: [],
      leave: [
        { employeeId: "e1", days: 2, leaveTypeName: "Annual Leave", isUnpaid: false },
        { employeeId: "e1", days: 1, leaveTypeName: "Sick leave", isUnpaid: false },
        { employeeId: "e1", days: 3, leaveTypeName: "Leave without pay", isUnpaid: true },
      ],
      allowances: [],
    });
    expect(lines).toEqual([
      { ...base, earningName: "Annual leave", hours: 15.2, rate: 30, amount: 456 },
      { ...base, earningName: "Personal leave", hours: 7.6, rate: 30, amount: 228 },
    ]);
  });

  it("passes allowance amounts through with no hours or rate", () => {
    const lines = mapAuPayFileLines({
      ...period,
      employees,
      sessions: [],
      overtime: [],
      leave: [],
      allowances: [{ employeeId: "e1", amount: 55.5 }],
    });
    expect(lines).toEqual([
      { ...base, earningName: "Allowance", hours: null, rate: null, amount: 55.5 },
    ]);
  });
});
