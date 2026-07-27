function escapeCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function rowsToCsv(headers: string[], rows: string[][]): string {
  const lines = [headers.map(escapeCell).join(",")];
  for (const row of rows) {
    lines.push(row.map((cell) => escapeCell(String(cell ?? ""))).join(","));
  }
  return lines.join("\n");
}
