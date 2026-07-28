/** Organization, role, employee, and payroll test fixtures. */

import employeesFixture from "./fixtures/sanitized/employees.json" with { type: "json" };
import organizationFixture from "./fixtures/sanitized/organization.json" with { type: "json" };
import payrollGoldenCases from "./fixtures/payroll-golden-cases.json" with { type: "json" };
import calculatorBenchmarks from "./fixtures/calculator-benchmarks.json" with { type: "json" };
import kwspEpfLine from "./fixtures/exports/kwsp-epf-line.json" with { type: "json" };
import perkesoAssistV2Line from "./fixtures/exports/perkeso-assist-v2-line.json" with { type: "json" };

export const TEST_ORGANIZATION_ID = organizationFixture.organization.id;

export function getSanitizedOrganization() {
  return organizationFixture;
}

export function getSanitizedEmployees() {
  return employeesFixture;
}

export function getPayrollGoldenCases() {
  return payrollGoldenCases;
}

export function getCalculatorBenchmarks() {
  return calculatorBenchmarks;
}

export function getExportFixtures() {
  return {
    kwsp: kwspEpfLine,
    perkeso: perkesoAssistV2Line,
  };
}

export { employeesFixture, organizationFixture, payrollGoldenCases, calculatorBenchmarks };
