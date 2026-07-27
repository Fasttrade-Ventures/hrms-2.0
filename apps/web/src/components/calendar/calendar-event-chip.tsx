import type { CalendarDayEvent } from "@hrms/domain";

import { cn } from "@/lib/utils";

function chipClass(event: CalendarDayEvent): string {
  if (event.kind === "holiday") return "bg-sky-100 text-sky-900";
  if (event.kind === "company_event") {
    switch (event.companyEventKind) {
      case "office_closure":
        return "bg-rose-100 text-rose-900";
      case "training":
        return "bg-violet-100 text-violet-900";
      case "town_hall":
        return "bg-indigo-100 text-indigo-900";
      default:
        return "bg-slate-100 text-slate-900";
    }
  }
  return event.status === "pending" ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900";
}

export function CalendarEventChip({
  event,
  compact = false,
  onClick,
}: {
  event: CalendarDayEvent;
  compact?: boolean;
  onClick?: () => void;
}) {
  const label = compact && event.title.length > 18 ? `${event.title.slice(0, 16)}…` : event.title;

  return (
    <button
      className={cn(
        "block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium leading-tight",
        chipClass(event),
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      type="button"
    >
      {label}
    </button>
  );
}
