import type { PayrunDetail } from "@/lib/payroll/queries";

function formatAmount(value: number) {
  return value.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function StatutoryPair({
  label,
  employee,
  employer,
}: {
  label: string;
  employee: number;
  employer: number;
}) {
  return (
    <div className="rounded-lg border border-[var(--border-primary)]/60 bg-[var(--surface-muted)]/35 px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 space-y-0.5 text-xs tabular-nums leading-tight">
        <p>
          <span className="mr-1 text-[10px] font-medium uppercase text-muted-foreground">EE</span>
          {formatAmount(employee)}
        </p>
        <p>
          <span className="mr-1 text-[10px] font-medium uppercase text-muted-foreground">ER</span>
          {formatAmount(employer)}
        </p>
      </div>
    </div>
  );
}

function SingleStat({
  label,
  value,
  side,
}: {
  label: string;
  value: number;
  side: "EE" | "ER";
}) {
  return (
    <div className="rounded-lg border border-[var(--border-primary)]/60 bg-[var(--surface-muted)]/35 px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-xs tabular-nums">
        <span className="mr-1 text-[10px] font-medium uppercase text-muted-foreground">{side}</span>
        {formatAmount(value)}
      </p>
    </div>
  );
}

export function PayrunTotalsSummary({
  totals,
  employeeCount,
}: {
  totals: PayrunDetail["totals"];
  employeeCount: number;
}) {
  const totalDeductions = totals.gross - totals.net;
  const employerStatutory =
    totals.epfEmployer + totals.socsoEmployer + totals.eisEmployer + totals.hrdfEmployer;

  return (
    <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-primary)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-primary)] bg-[var(--surface-muted)]/50 px-4 py-2">
        <p className="text-sm font-medium text-foreground">Payrun summary</p>
        <p className="text-xs text-muted-foreground">
          {employeeCount} employee line{employeeCount === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid sm:grid-cols-2">
        <div className="border-b border-[var(--border-primary)] px-4 py-3 sm:border-b-0 sm:border-r">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Gross pay</p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight">RM {formatAmount(totals.gross)}</p>
        </div>
        <div className="border-b border-[var(--border-primary)] bg-[var(--accent-primary)]/5 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-primary)]">
            Net pay
          </p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight text-[var(--accent-primary)]">
            RM {formatAmount(totals.net)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-b border-[var(--border-primary)] p-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatutoryPair
          employee={totals.epfEmployee}
          employer={totals.epfEmployer}
          label="EPF"
        />
        <StatutoryPair
          employee={totals.socsoEmployee}
          employer={totals.socsoEmployer}
          label="SOCSO"
        />
        <StatutoryPair employee={totals.eisEmployee} employer={totals.eisEmployer} label="EIS" />
        <SingleStat label="PCB" side="EE" value={totals.pcb} />
        <SingleStat label="HRDF" side="ER" value={totals.hrdfEmployer} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 bg-[var(--surface-muted)]/30 px-4 py-2 text-xs text-muted-foreground">
        <span>
          Employee deductions{" "}
          <span className="font-medium tabular-nums text-foreground">RM {formatAmount(totalDeductions)}</span>
        </span>
        <span>
          Employer statutory{" "}
          <span className="font-medium tabular-nums text-foreground">
            RM {formatAmount(employerStatutory)}
          </span>
        </span>
      </div>
    </div>
  );
}
