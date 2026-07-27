import type { HrActionState } from "@/app/(hr)/hr/payroll/actions";
import { HrFormMessage } from "@/components/hr/employees/form-fields";
import { cn } from "@/lib/utils";

export function ExportDownloadMessage({ state }: { state: HrActionState }) {
  if (state.error) {
    return <HrFormMessage error={state.error} />;
  }

  if (!state.success && !state.downloadHref) {
    return null;
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-accent px-3 py-2.5 text-sm text-foreground">
      {state.success ? <p>{state.success}</p> : null}
      {state.downloadHref ? (
        <p className={cn(state.success && "mt-1.5")}>
          <a
            className="font-medium text-[var(--accent-primary)] underline underline-offset-2 hover:opacity-90"
            href={state.downloadHref}
            rel="noopener noreferrer"
            target="_blank"
          >
            Download {state.downloadFileName ?? "export file"}
          </a>
        </p>
      ) : null}
    </div>
  );
}
