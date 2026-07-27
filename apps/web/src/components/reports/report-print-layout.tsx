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
  const generatedAt = new Date().toLocaleString("en-MY");

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
                  {row[column.key] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
