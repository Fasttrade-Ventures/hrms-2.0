import { rowsToCsv } from "@hrms/domain";

import type { ComplianceMatrixRow } from "@/lib/hr/documents";

export function complianceMatrixToCsv(rows: ComplianceMatrixRow[], requiredNames: string[]): string {
  const headers = ["Employee #", "Employee", ...requiredNames];
  const flatRows = rows.flatMap((row) => {
    if (requiredNames.length === 0) {
      return [[row.employeeNumber, row.employeeName].map(String)];
    }
    return requiredNames.map((name) => {
      const cell = row.cells.find((item) => item.requiredDocumentName === name);
      return [row.employeeNumber, row.employeeName, name, cell?.status ?? "missing", cell?.expiresAt ?? ""].map(
        String,
      );
    });
  });

  if (requiredNames.length === 0) {
    return rowsToCsv(headers.slice(0, 2), flatRows as string[][]);
  }

  return rowsToCsv(
    ["Employee #", "Employee", "Required document", "Status", "Expires"],
    flatRows as string[][],
  );
}
