function formatReportCell(value: string | number | null | undefined): string | number {
  if (value == null || value === "") return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }
  }
  return value;
}

export function ReportPrintLayout({
  title,
  filterSummary,
  columns,
  rows,
}: {
  title: string;
  filterSummary: string;
  columns: { key: string; label: string }[];
  rows: Record<string, string | number | null>[];
}) {
  const now = new Date();
  const generatedAt = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}, ${now.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit", hour12: true })}`;

  return (
    <div className="hidden print:block">
      <div className="mb-4 space-y-1">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{filterSummary}</p>
        <p className="text-xs text-muted-foreground" suppressHydrationWarning>
          Generated {generatedAt}
        </p>
      </div>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            {columns.map((column) => (
              <th className="border border-border px-2 py-1 text-left font-medium" key={column.key}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td className="border border-border px-2 py-1" key={column.key}>
                  {formatReportCell(row[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
