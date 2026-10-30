"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

import { ConfirmDialog, EmptyState } from "@hrms/ui";

import type { OrgActionState } from "@/app/(hr)/hr/organization/actions";
import { HrStatCards, HrTableCard } from "@/components/hr/hr-ui";
import { HrLinkButton } from "@/components/hr/hr-ui.client";
import {
  HrCheckbox,
  HrField,
  HrFormMessage,
  HrGhostButton,
  HrPrimaryButton,
  HrSelect,
  HrTextInput,
  HrTextarea,
} from "@/components/hr/employees/form-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function OrgTableRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr className={cn("transition-colors hover:bg-muted/30", className)}>
      {children}
    </tr>
  );
}

export function OrgTableCell({
  children,
  variant = "secondary",
  className,
}: {
  children: ReactNode;
  variant?: "name" | "secondary" | "muted";
  className?: string;
}) {
  const variantClass = {
    name: "font-semibold text-foreground",
    secondary: "text-muted-foreground",
    muted: "text-muted-foreground",
  }[variant];

  return (
    <td className={cn("px-4 py-3.5 align-middle text-sm", className)}>
      <div className={cn("min-w-0", variantClass)}>{children}</div>
    </td>
  );
}

export function OrgTableStatus({
  label = "Active",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const isInactive = label.trim().toLowerCase() === "inactive";
  const isActive = label.trim().toLowerCase() === "active";

  return (
    <td className={cn("px-4 py-3.5 align-middle whitespace-nowrap", className)}>
      <div className="flex w-fit items-center">
        <Badge
          className={cn(
            isActive &&
              "border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
            isInactive &&
              "border-rose-500/30 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
          )}
          variant={isActive || isInactive ? "outline" : "secondary"}
        >
          {label}
        </Badge>
      </div>
    </td>
  );
}

export function OrgTableEditLink({
  href,
  className,
}: {
  href: string;
  className?: string;
}) {
  return (
    <td className={cn("px-4 py-3.5 align-middle text-right whitespace-nowrap", className)}>
      <div className="flex items-center justify-end">
        <HrLinkButton href={href} size="sm" variant="outline">
          Edit
        </HrLinkButton>
      </div>
    </td>
  );
}

export function OrgStatCards({
  items,
  columns,
}: {
  items: Array<{ label: string; value: string | number; hint?: string }>;
  columns?: 3 | 5;
}) {
  return <HrStatCards columns={columns} items={items} />;
}

export function OrgTableShell({
  headers,
  children,
  emptyTitle,
  emptyDescription,
  isEmpty,
  sort,
  getSortHref,
}: {
  headers: Array<string | { label: string; sortKey: string }>;
  children: ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  isEmpty: boolean;
  sort?: { key: string; order: "asc" | "desc" };
  getSortHref?: (key: string, order: "asc" | "desc") => string;
}) {
  return (
    <HrTableCard>
      {isEmpty ? (
        <div className="p-8">
          <EmptyState description={emptyDescription} title={emptyTitle} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                {headers.map((header, index) => {
                  const isLast = index === headers.length - 1;
                  const { label, sortKey } =
                    typeof header === "string" ? { label: header, sortKey: undefined } : header;
                  const isAction = label.toLowerCase() === "action";
                  const alignRight = isLast || isAction;

                  if (!sortKey || !getSortHref) {
                    return (
                      <th
                        className={cn(
                          "px-4 py-3 font-semibold whitespace-nowrap",
                          alignRight ? "text-right" : "text-left",
                        )}
                        key={label}
                      >
                        <span className="truncate">{label}</span>
                      </th>
                    );
                  }

                  const isActive = sort?.key === sortKey;
                  const nextOrder = isActive && sort.order === "asc" ? "desc" : "asc";

                  return (
                    <th
                      className={cn(
                        "px-4 py-3 font-semibold whitespace-nowrap",
                        alignRight ? "text-right" : "text-left",
                      )}
                      key={sortKey}
                    >
                      <Link
                        className={cn(
                          "inline-flex min-w-0 items-center gap-1 truncate hover:text-foreground",
                          isActive && "text-foreground",
                        )}
                        href={getSortHref(sortKey, nextOrder)}
                      >
                        <span className="truncate">{label}</span>
                        <span aria-hidden className="text-[10px] normal-case">
                          {isActive ? (sort.order === "asc" ? "↑" : "↓") : "↕"}
                        </span>
                      </Link>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">{children}</tbody>
          </table>
        </div>
      )}
    </HrTableCard>
  );
}

export function OrgFormCard({
  title,
  description,
  backHref,
  children,
}: {
  title: string;
  description: string;
  backHref: string;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden py-0">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-primary px-5 py-4 text-primary-foreground">
        <div className="space-y-0.5">
          <CardTitle className="text-base text-primary-foreground">{title}</CardTitle>
          <p className="text-xs text-primary-foreground/80">{description}</p>
        </div>
        <Button
          aria-label="Close"
          className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          render={<Link href={backHref} />}
          size="icon-sm"
          variant="ghost"
        >
          ✕
        </Button>
      </CardHeader>
      <CardContent className="space-y-5 py-5">{children}</CardContent>
    </Card>
  );
}

export function OrgDeleteButton({
  label,
  confirmTitle,
  confirmDescription,
  onDelete,
  redirectHref,
}: {
  label: string;
  confirmTitle: string;
  confirmDescription: string;
  onDelete: () => Promise<OrgActionState>;
  redirectHref?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button onClick={() => setOpen(true)} type="button" variant="outline">
        {label}
      </Button>
      <ConfirmDialog
        confirmLabel={pending ? "Deleting…" : "Delete"}
        message={error ? `${confirmDescription}\n\n${error}` : confirmDescription}
        onCancel={() => {
          setOpen(false);
          setError(undefined);
        }}
        onConfirm={() =>
          startTransition(async () => {
            const result = await onDelete();
            if (result.error) {
              setError(result.error);
              return;
            }
            setOpen(false);
            if (redirectHref) {
              router.push(redirectHref);
            }
            router.refresh();
          })
        }
        open={open}
        title={confirmTitle}
        tone="danger"
      />
      {error && !open ? <p className="text-sm text-destructive">{error}</p> : null}
    </>
  );
}

export function OrgFormActions({
  pending,
  cancelHref,
  submitLabel,
  error,
  success,
  extra,
}: {
  pending: boolean;
  cancelHref: string;
  submitLabel: string;
  error?: string;
  success?: string;
  extra?: ReactNode;
}) {
  return (
    <div className="space-y-4 border-t pt-4">
      <HrFormMessage error={error} success={success} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>{extra}</div>
        <div className="flex gap-2">
          <HrLinkButton href={cancelHref} variant="outline">
            Cancel
          </HrLinkButton>
          <HrPrimaryButton disabled={pending} type="submit">
            {pending ? "Saving…" : submitLabel}
          </HrPrimaryButton>
        </div>
      </div>
    </div>
  );
}

export {
  HrCheckbox,
  HrField,
  HrPrimaryButton,
  HrGhostButton,
  HrSelect,
  HrTextInput,
  HrTextarea,
};
