const EMPLOYEE_NUMBER_PREFIX = "EMP-";

export function formatEmployeeNumber(sequence: number): string {
  return `${EMPLOYEE_NUMBER_PREFIX}${String(sequence).padStart(3, "0")}`;
}

export function parseEmployeeNumberSequence(employeeNumber: string): number | null {
  if (!employeeNumber.startsWith(EMPLOYEE_NUMBER_PREFIX)) {
    return null;
  }

  const parsed = Number.parseInt(employeeNumber.slice(EMPLOYEE_NUMBER_PREFIX.length), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getNextEmployeeNumberFromList(employeeNumbers: readonly string[]): string {
  const sequences = employeeNumbers
    .map(parseEmployeeNumberSequence)
    .filter((value): value is number => value !== null);

  const next = sequences.length > 0 ? Math.max(...sequences) + 1 : 1;
  return formatEmployeeNumber(next);
}
