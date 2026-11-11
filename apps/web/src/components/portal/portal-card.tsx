import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Shared portal surface — prefer this over ad-hoc shadcn Card for list/filter shells. */
export function PortalCard({
  children,
  className,
  padding = "md",
}: {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}) {
  const pad =
    padding === "none"
      ? "p-0"
      : padding === "sm"
        ? "p-3"
        : padding === "lg"
          ? "p-6"
          : "p-4";

  return (
    <div
      className={cn(
        "rounded-[var(--radius-xl)] border border-[var(--border-primary)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]",
        pad,
        className,
      )}
    >
      {children}
    </div>
  );
}
