export type NamedCount = { id: string; name: string; count: number };

export function incrementNamedCount(
  map: Map<string, NamedCount>,
  id: string,
  name: string,
  by = 1,
): void {
  const row = map.get(id) ?? { id, name, count: 0 };
  row.count += by;
  map.set(id, row);
}

export function sortedNamedCounts(map: Map<string, NamedCount>): NamedCount[] {
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function emptyMonthSeries(months: string[], keys: string[]): Array<Record<string, string | number>> {
  return months.map((month) => {
    const row: Record<string, string | number> = { month };
    for (const key of keys) row[key] = 0;
    return row;
  });
}

export function addToMonthSeries(
  series: Array<Record<string, string | number>>,
  month: string,
  key: string,
  amount: number,
): void {
  const row = series.find((item) => item.month === month);
  if (!row) return;
  row[key] = Number(row[key] ?? 0) + amount;
}

export function countByKey(values: string[]): Array<{ key: string; count: number }> {
  const map = new Map<string, number>();
  for (const value of values) {
    map.set(value, (map.get(value) ?? 0) + 1);
  }
  return [...map.entries()].map(([key, count]) => ({ key, count }));
}
