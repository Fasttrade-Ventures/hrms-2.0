export function isPastRetention(input: {
  asOf: string;
  retentionDays: number | null;
  recordAt: string;
}): boolean {
  if (input.retentionDays == null) return false;
  const asOf = new Date(input.asOf);
  const recordAt = new Date(input.recordAt);
  if (Number.isNaN(asOf.getTime()) || Number.isNaN(recordAt.getTime())) return false;
  const cutoff = asOf.getTime() - input.retentionDays * 24 * 60 * 60 * 1000;
  return recordAt.getTime() < cutoff;
}
