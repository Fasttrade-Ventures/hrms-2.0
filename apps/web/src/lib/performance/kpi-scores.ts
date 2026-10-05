export type KpiScoreInput = {
  name: string;
  weight: number;
  employeeScore: number | null;
  managerScore: number | null;
};

export function weightedKpiRating(rows: KpiScoreInput[]): number | null {
  const scored = rows.filter(
    (row) =>
      row.weight > 0 &&
      row.employeeScore != null &&
      row.managerScore != null &&
      Number.isFinite(row.employeeScore) &&
      Number.isFinite(row.managerScore),
  );
  if (scored.length === 0) return null;

  const weight = scored.reduce((sum, row) => sum + row.weight, 0);
  const total = scored.reduce(
    (sum, row) => sum + row.weight * ((row.employeeScore! + row.managerScore!) / 2),
    0,
  );
  return Math.round((total / weight) * 100) / 100;
}
