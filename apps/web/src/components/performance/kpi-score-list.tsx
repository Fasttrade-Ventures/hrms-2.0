import { PortalSectionCard } from "@/components/portal/portal-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AppraisalKpiRow } from "@/lib/performance/kpi-service";
import { saveEmployeeKpiScore, saveManagerKpiScore } from "@/lib/performance/kpi-actions";

export function KpiScoreList({
  appraisalId,
  rows,
  rating,
  side,
}: {
  appraisalId: string;
  rows: AppraisalKpiRow[];
  rating: number | null;
  side: "employee" | "manager";
}) {
  if (rows.length === 0) return null;
  const action = side === "employee" ? saveEmployeeKpiScore : saveManagerKpiScore;

  return (
    <PortalSectionCard
      description={
        rating == null
          ? "Overall rating: waiting for both employee and manager scores."
          : `Overall rating: ${rating}`
      }
      title="KPIs"
    >
      <ul className="space-y-3">
        {rows.map((row) => (
          <li
            className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-3 py-3 sm:px-4"
            key={row.kpiId}
          >
            <form
              action={action.bind(null, appraisalId)}
              className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
            >
              <input name="kpiId" type="hidden" value={row.kpiId} />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-medium text-[var(--foreground-primary)]">{row.name}</p>
                <p className="text-xs text-[var(--foreground-muted)]">
                  Weight {row.weight}
                  {row.target ? ` · Target ${row.target}` : ""}
                </p>
                <div className="flex flex-wrap gap-3 pt-1 text-xs text-[var(--foreground-secondary)]">
                  <span>
                    Employee:{" "}
                    {row.employeeScore != null ? `${row.employeeScore}/5` : "—"}
                  </span>
                  <span>
                    Manager: {row.managerScore != null ? `${row.managerScore}/5` : "—"}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1">
                  <Label className="text-xs" htmlFor={`kpi-score-${row.kpiId}`}>
                    Your score
                  </Label>
                  <Input
                    className="h-10 w-24"
                    defaultValue={
                      side === "employee" ? (row.employeeScore ?? "") : (row.managerScore ?? "")
                    }
                    id={`kpi-score-${row.kpiId}`}
                    max={5}
                    min={1}
                    name="score"
                    required
                    step="0.5"
                    type="number"
                  />
                </div>
                <Button size="sm" type="submit" variant="outline">
                  Save score
                </Button>
              </div>
            </form>
          </li>
        ))}
      </ul>
    </PortalSectionCard>
  );
}
