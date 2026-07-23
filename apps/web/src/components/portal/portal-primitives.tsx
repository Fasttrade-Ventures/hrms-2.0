import Link from "next/link";
import type { ReactNode } from "react";

import type { PortalIconName } from "./portal-icons";
import { PortalIcon } from "./portal-icons";

export function PortalBrand() {
  return (
    <Link className="flex items-center gap-3 px-2" href="/">
      <div className="flex h-9 w-9 items-center justify-center bg-[var(--accent-primary)] text-white">
        <span className="text-lg font-bold leading-none">H</span>
      </div>
      <span className="text-xl font-bold text-[var(--foreground-primary)]">HRMS</span>
    </Link>
  );
}

export function PortalNavItem({
  href,
  label,
  icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: PortalIconName;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      className={`flex h-10 items-center gap-2.5 px-3 text-sm transition-colors ${
        active
          ? "bg-[var(--surface-accent-soft)] font-semibold text-[var(--accent-primary)]"
          : "font-medium text-[var(--foreground-secondary)] hover:bg-[var(--surface-muted)]"
      }`}
      href={href}
      onClick={onNavigate}
    >
      <PortalIcon className="shrink-0" name={icon} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function PortalAvatar({ name, email }: { name?: string; email?: string }) {
  const label = name?.trim() || email?.trim() || "User";
  const initials = label
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-[var(--surface-accent-soft)] text-xs font-semibold text-[var(--accent-primary)]">
      {initials || "U"}
    </div>
  );
}

export function PortalUserMenu({
  name,
  email,
}: {
  name?: string;
  email?: string;
}) {
  const displayName = name?.trim() || email?.split("@")[0] || "User";

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-sm font-medium text-[var(--foreground-primary)]">{displayName}</p>
        {email ? <p className="text-xs text-[var(--foreground-muted)]">{email}</p> : null}
      </div>
      <PortalAvatar email={email} name={name} />
    </div>
  );
}

export function PortalPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-[28px] font-semibold tracking-tight text-[var(--foreground-primary)]">{title}</h1>
        {description ? (
          <p className="text-sm text-[var(--foreground-secondary)]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
