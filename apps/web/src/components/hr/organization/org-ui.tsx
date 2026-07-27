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
} from "@/components/hr/employees/form-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ORG_TABLE_GRID =
  "md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.85fr)_minmax(0,0.75fr)_5rem_4.5rem] md:items-center md:gap-x-3";

const ORG_TABLE_ROW = `px-3.5 py-2.5 ${ORG_TABLE_GRID}`;

export function OrgTableRow({ children }: { children: ReactNode }) {
  return <div className={ORG_TABLE_ROW}>{children}</div>;
}

export function OrgTableCell({
  children,
  variant = "secondary",
}: {
  children: ReactNode;
  variant?: "name" | "secondary" | "muted";
}) {
  const variantClass = {
    name: "font-semibold text-foreground",
    secondary: "text-muted-foreground",
    muted: "text-muted-foreground",
  }[variant];

  return <p className={cn("min-w-0 truncate text-sm", variantClass)}>{children}</p>;
}

export function OrgTableStatus({ label = "Active" }: { label?: string }) {
  return (
    <div className="flex w-fit items-center justify-self-start">
      <Badge variant="secondary">{label}</Badge>
    </div>
  );
}

export function OrgTableEditLink({ href }: { href: string }) {
  return (
    <div className="flex items-center justify-self-start">
      <HrLinkButton href={href} size="sm" variant="outline">
        Edit
      </HrLinkButton>
    </div>
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
      <div
        className={cn(
          "hidden border-b bg-muted/50 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
          ORG_TABLE_ROW,
        )}
      >
        {headers.map((header) => {
          const { label, sortKey } =
            typeof header === "string" ? { label: header, sortKey: undefined } : header;

          if (!sortKey || !getSortHref) {
            return (
              <span className="truncate" key={label}>
                {label}
              </span>
            );
          }

          const isActive = sort?.key === sortKey;
          const nextOrder = isActive && sort.order === "asc" ? "desc" : "asc";

          return (
            <Link
              className={cn(
                "inline-flex min-w-0 items-center gap-1 truncate hover:text-foreground",
                isActive && "text-foreground",
              )}
              href={getSortHref(sortKey, nextOrder)}
              key={sortKey}
            >
              <span className="truncate">{label}</span>
              <span aria-hidden className="text-[10px] normal-case">
                {isActive ? (sort.order === "asc" ? "↑" : "↓") : "↕"}
              </span>
            </Link>
          );
        })}
      </div>
      {isEmpty ? (
        <div className="p-8">
          <EmptyState description={emptyDescription} title={emptyTitle} />
        </div>
      ) : (
        <div className="divide-y divide-border">{children}</div>
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
};
