export function monthDay(isoDate: string): string {
  return isoDate.slice(5, 10);
}

export function isBirthdayOn(dateOfBirth: string | null, today: string): boolean {
  if (!dateOfBirth || dateOfBirth.length < 10) return false;
  return monthDay(dateOfBirth) === monthDay(today);
}

export function isAnniversaryOn(joinDate: string, today: string): boolean {
  if (!joinDate || joinDate.length < 10) return false;
  return monthDay(joinDate) === monthDay(today) && joinDate.slice(0, 4) !== today.slice(0, 4);
}

export function celebrationKey(input: {
  organizationId: string;
  employeeId: string;
  kind: "birthday" | "anniversary" | "digest";
  today: string;
}): string {
  return `celebration:${input.organizationId}:${input.employeeId}:${input.kind}:${input.today}`;
}
