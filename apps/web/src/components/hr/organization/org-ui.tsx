"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

import { ConfirmDialog, EmptyState, StatusPill } from "@hrms/ui";

import type { OrgActionState } from "@/app/(hr)/hr/organization/actions";
import {
  HrCheckbox,
  HrField,
  HrFormMessage,
  HrGhostButton,
  HrPrimaryButton,
  HrSelect,
  HrTextInput,
} from "@/components/hr/employees/form-fields";

export function OrgStatCards({
  items,
}: {
  items: Array<{ label: string; value: string | number; hint: string }>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div
          className="rounded-[14px] border border-[var(--border-primary)] bg-[var(--surface-card)] p-3.5 shadow-[var(--shadow-card)]"
          key={item.label}
        >
          <p className="text-xs font-medium text-[var(--foreground-muted)]">{item.label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-[var(--foreground-primary)]">
            {item.value}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--foreground-muted)]">{item.hint}</p>
        </div>
      ))}
    </div>
  );
}

export function OrgTableShell({
  headers,
  children,
  emptyTitle,
  emptyDescription,
  isEmpty,
}: {
  headers: string[];
  children: ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  isEmpty: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border-primary)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]">
      <div className="hidden grid-cols-6 gap-3 border-b border-[var(--border-primary)] bg-[var(--surface-muted)] px-3.5 py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--foreground-muted)] md:grid">
        {headers.map((header) => (
          <span key={header}>{header}</span>
        ))}
      </div>
      {isEmpty ? (
        <div className="p-8">
          <EmptyState description={emptyDescription} title={emptyTitle} />
        </div>
      ) : (
        <div className="divide-y divide-[var(--border-primary)]">{children}</div>
      )}
    </div>
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
    <div className="overflow-hidden rounded-2xl border border-[var(--border-primary)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between bg-[var(--accent-primary)] px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <p className="text-xs text-white/80">{description}</p>
        </div>
        <Link aria-label="Close" className="text-white/90 hover:text-white" href={backHref}>
          ✕
        </Link>
      </div>
      <div className="space-y-5 p-5">{children}</div>
    </div>
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
      <HrGhostButton className="text-[var(--danger)]" onClick={() => setOpen(true)} type="button">
        {label}
      </HrGhostButton>
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
      {error && !open ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
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
    <div className="space-y-4 border-t border-[var(--border-primary)] pt-4">
      <HrFormMessage error={error} success={success} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>{extra}</div>
        <div className="flex gap-2">
          <Link href={cancelHref}>
            <HrGhostButton type="button">Cancel</HrGhostButton>
          </Link>
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
  StatusPill,
};
