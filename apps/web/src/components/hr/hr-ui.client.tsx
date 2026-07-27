"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import type { HrPaginationLink } from "@/components/hr/hr-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function HrLinkButton({
  href,
  children,
  variant = "default",
  size = "default",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary";
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm";
  className?: string;
}) {
  return (
    <Button className={className} render={<Link href={href} />} size={size} variant={variant}>
      {children}
    </Button>
  );
}

export function HrFilterButton({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Button render={<Link href={href} />} size="sm" variant={active ? "default" : "outline"}>
      {children}
    </Button>
  );
}

export function HrPagination({
  from,
  to,
  total,
  page,
  pageLinks,
  prevHref,
  nextHref,
  itemLabel = "items",
}: {
  from: number;
  to: number;
  total: number;
  page: number;
  pageLinks: HrPaginationLink[];
  prevHref?: string;
  nextHref?: string;
  itemLabel?: string;
}) {
  if (total === 0) return null;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Showing {from}–{to} of {total} {itemLabel}
      </p>
      <div className="flex items-center gap-1">
        {prevHref ? (
          <Button render={<Link href={prevHref} />} size="icon-sm" variant="outline">
            ‹
          </Button>
        ) : (
          <Button disabled size="icon-sm" variant="outline">
            ‹
          </Button>
        )}
        {pageLinks.map((link) => (
          <Button
            key={link.page}
            render={<Link href={link.href} />}
            size="sm"
            variant={link.page === page ? "default" : "outline"}
          >
            {link.page}
          </Button>
        ))}
        {nextHref ? (
          <Button render={<Link href={nextHref} />} size="icon-sm" variant="outline">
            ›
          </Button>
        ) : (
          <Button disabled size="icon-sm" variant="outline">
            ›
          </Button>
        )}
      </div>
    </div>
  );
}

export function HrStatusBadge({
  label,
  variant = "secondary",
}: {
  label: string;
  variant?: "default" | "secondary" | "destructive" | "outline";
}) {
  return <Badge variant={variant}>{label}</Badge>;
}
