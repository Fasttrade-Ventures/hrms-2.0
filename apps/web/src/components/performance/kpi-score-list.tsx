import { saveEmployeeKpiScore, saveManagerKpiScore, type AppraisalKpiRow } from "@/lib/performance/kpi-service";

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
    <section className="space-y-3 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6">
      <h2 className="text-base font-semibold">KPIs</h2>
      <p className="text-sm text-[var(--foreground-muted)]">
        Overall rating: {rating == null ? "Waiting for both scores" : rating}
      </p>
      {rows.map((row) => (
        <form action={action.bind(null, appraisalId)} className="flex flex-wrap items-end gap-3" key={row.kpiId}>
          <input name="kpiId" type="hidden" value={row.kpiId} />
          <div className="min-w-48 text-sm">
            <p className="font-medium">{row.name}</p>
            <p className="text-[var(--foreground-muted)]">
              Weight {row.weight}
              {row.target ? ` · Target ${row.target}` : ""}
            </p>
          </div>
          <label className="text-sm">
            Your score
            <input
              className="mt-1 block h-10 w-24 border border-[var(--border-primary)] px-3"
              defaultValue={side === "employee" ? (row.employeeScore ?? "") : (row.managerScore ?? "")}
              max={5}
              min={1}
              name="score"
              required
              step="0.5"
              type="number"
            />
          </label>
          <button className="h-10 border border-[var(--border-primary)] px-3 text-sm" type="submit">
            Save score
          </button>
        </form>
      ))}
    </section>
  );
}
