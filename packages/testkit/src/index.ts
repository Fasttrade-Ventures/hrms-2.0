/** Organization, role, employee, and payroll test fixtures. */

import employeesFixture from "./fixtures/sanitized/employees.json" with { type: "json" };
import organizationFixture from "./fixtures/sanitized/organization.json" with { type: "json" };
import payrollGoldenCases from "./fixtures/payroll-golden-cases.json" with { type: "json" };
import calculatorBenchmarks from "./fixtures/calculator-benchmarks.json" with { type: "json" };

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

export { employeesFixture, organizationFixture, payrollGoldenCases, calculatorBenchmarks };
