import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function PortalFilterChips({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)} role="group">
      {children}
    </div>
  );
}

export function PortalFilterChip({
  href,
  active = false,
  onClick,
  children,
  className,
}: {
  href?: string;
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  const chipClass = cn(
    "inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors",
    active
      ? "border-transparent bg-[var(--surface-accent-soft)] text-[var(--accent-primary)]"
      : "border-[var(--border-primary)] bg-[var(--surface-card)] text-[var(--foreground-secondary)] hover:bg-[var(--surface-muted)]",
    className,
  );

  if (href) {
    return (
      <Link aria-current={active ? "page" : undefined} className={chipClass} href={href}>
        {children}
      </Link>
    );
  }

  return (
    <button
      aria-pressed={active}
      className={chipClass}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
