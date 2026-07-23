"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { PortalIconName } from "@/components/portal/portal-icons";
import { PortalIcon } from "@/components/portal/portal-icons";
import type { PortalNavItem } from "@/lib/portal-nav";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 16 16"
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function childActive(pathname: string, href: string, siblings: PortalNavItem[]): boolean {
  if (pathname === href) return true;

  const moreSpecificSibling = siblings.some(
    (sibling) =>
      sibling.href !== href &&
      sibling.href.length > href.length &&
      (pathname === sibling.href || pathname.startsWith(`${sibling.href}/`)),
  );
  if (moreSpecificSibling) return false;

  return pathname.startsWith(`${href}/`);
}

function groupActive(pathname: string, item: PortalNavItem): boolean {
  if (pathname === item.href || pathname.startsWith(`${item.href}/`)) return true;
  return (item.children ?? []).some(
    (child) => pathname === child.href || pathname.startsWith(`${child.href}/`),
  );
}

export function PortalNavItemLink({
  href,
  label,
  icon,
  active,
  onNavigate,
  nested = false,
}: {
  href: string;
  label: string;
  icon: PortalIconName;
  active: boolean;
  onNavigate?: () => void;
  nested?: boolean;
}) {
  return (
    <Link
      className={`flex h-9 items-center gap-2 rounded-[var(--radius-sm)] text-sm transition-colors ${
        nested ? "px-2.5" : "px-3 h-10 gap-2.5"
      } ${
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

export function PortalNavGroup({
  item,
  pathname,
  onNavigate,
}: {
  item: PortalNavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const children = item.children ?? [];
  const active = groupActive(pathname, item);
  const [open, setOpen] = useState(active);

  useEffect(() => {
    if (active) setOpen(true);
  }, [active, pathname]);

  if (children.length === 0) {
    return (
      <PortalNavItemLink
        active={pathname === item.href || (!item.href.endsWith("/dashboard") && pathname.startsWith(`${item.href}/`))}
        href={item.href}
        icon={item.icon}
        label={item.label}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <div className="space-y-0.5">
      <div
        className={`flex h-10 items-center rounded-[var(--radius-sm)] transition-colors ${
          active
            ? "bg-[var(--surface-accent-soft)] text-[var(--accent-primary)]"
            : "text-[var(--foreground-secondary)] hover:bg-[var(--surface-muted)]"
        }`}
      >
        <Link
          className="flex min-w-0 flex-1 items-center gap-2.5 px-3 text-sm font-semibold"
          href={item.href}
          onClick={onNavigate}
        >
          <PortalIcon className="shrink-0" name={item.icon} />
          <span className="truncate">{item.label}</span>
        </Link>
        <button
          aria-expanded={open}
          aria-label={open ? `Collapse ${item.label}` : `Expand ${item.label}`}
          className="inline-flex h-10 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] hover:bg-black/5"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          <ChevronIcon open={open} />
        </button>
      </div>
      {open ? (
        <div className="space-y-0.5 border-l border-[var(--border-primary)] ml-5 pl-2">
          {children.map((child) => (
            <PortalNavItemLink
              active={childActive(pathname, child.href, children)}
              href={child.href}
              icon={child.icon}
              key={`${child.href}-${child.label}`}
              label={child.label}
              nested
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
