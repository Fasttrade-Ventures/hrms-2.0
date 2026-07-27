import { spotCheckFirstPayrunLine } from "@/lib/payroll/calculator-compare";
import { PortalSectionCard } from "@/components/portal/portal-section";

export async function PayrunCalculatorCompare({ payrunId }: { payrunId: string }) {
  const result = await spotCheckFirstPayrunLine(payrunId);

  if (!result) {
    return null;
  }

  return (
    <PortalSectionCard
      description="Recomputes the first employee line and compares stored amounts against the payroll calculator."
      title="Calculator spot check"
    >
      <p className="mb-4 text-sm text-muted-foreground">
        {result.employeeName} ({result.employeeNumber})
      </p>
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Field</th>
              <th className="px-3 py-2 font-medium">Stored</th>
              <th className="px-3 py-2 font-medium">Computed</th>
              <th className="px-3 py-2 font-medium">Match</th>
            </tr>
          </thead>
          <tbody>
            {result.fields.map((field) => (
              <tr className="border-t" key={field.field}>
                <td className="px-3 py-2">{field.field}</td>
                <td className="px-3 py-2 font-mono">RM {field.stored}</td>
                <td className="px-3 py-2 font-mono">RM {field.computed}</td>
                <td className="px-3 py-2">{field.match ? "✓" : "✗"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p
        className={`mt-3 text-sm ${result.allMatch ? "text-green-700" : "text-amber-800"}`}
      >
        {result.allMatch
          ? "Stored amounts match the calculator for this line."
          : "Some amounts differ — review component lines or employee payroll settings."}
      </p>
    </PortalSectionCard>
  );
}
