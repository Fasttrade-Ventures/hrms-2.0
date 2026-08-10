import { formatDateTime } from "@/components/employee/employee-shared";
import type { TimelineStep } from "@/lib/employee/requests";

export function ApprovalTimeline({ steps }: { steps: TimelineStep[] }) {
  if (!steps || !steps.length) return null;

  return (
    <div className="border border-[var(--border-primary)] bg-[var(--surface-card)] p-6">
      <h3 className="text-base font-semibold text-[var(--foreground-primary)] mb-6">
        Approval History
      </h3>
      <div className="relative pl-6 border-l-2 border-[var(--border-primary)] space-y-8 ml-3">
        {steps.map((step, idx) => {
          const isCompleted = step.status === "completed" || step.status === "approved";
          const isPending = step.status === "pending";
          const isRejected = step.status === "rejected";

          // Determine dot color/style
          let dotColor = "bg-[var(--surface-muted)] border-[var(--border-primary)] text-[var(--foreground-muted)]";
          let icon = null;

          if (isCompleted) {
            dotColor = "bg-emerald-500 border-emerald-500 text-white";
            icon = (
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            );
          } else if (isPending) {
            dotColor = "bg-amber-500 border-amber-500 text-white animate-pulse";
            icon = (
              <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            );
          } else if (isRejected) {
            dotColor = "bg-red-500 border-red-500 text-white";
            icon = (
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            );
          } else {
            // Default upcoming
            icon = <div className="h-1.5 w-1.5 rounded-full bg-[var(--foreground-muted)]" />;
          }

          return (
            <div key={idx} className="relative">
              {/* Dot indicator */}
              <div className={`absolute -left-[38px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 ${dotColor}`}>
                {icon}
              </div>

              {/* Content */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                  <span className="font-semibold text-sm text-[var(--foreground-primary)]">
                    {step.label}
                  </span>
                  {step.actedAt && (
                    <span className="text-xs text-[var(--foreground-muted)]">
                      {formatDateTime(step.actedAt)}
                    </span>
                  )}
                </div>

                {step.approverName && (
                  <p className="text-xs text-[var(--foreground-secondary)] mt-0.5">
                    {step.label === "Submitted" ? "Submitted by" : "Actioned by"} {step.approverName}
                  </p>
                )}

                {/* Comment box */}
                {step.comment && (
                  <div className="mt-2.5 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3 border border-[var(--border-primary)] text-sm text-[var(--foreground-primary)] italic relative">
                    <div className="absolute -top-1 left-4 w-2 h-2 bg-[var(--surface-muted)] border-t border-l border-[var(--border-primary)] rotate-45" />
                    &ldquo;{step.comment}&rdquo;
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
