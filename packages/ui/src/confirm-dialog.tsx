"use client";

import { useEffect, useRef, type ReactNode } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  tone?: "primary" | "danger" | "warning";
  isPending?: boolean;
};

function focusableControls(dialog: HTMLElement): HTMLElement[] {
  return Array.from(
    dialog.querySelectorAll<HTMLElement>("button:not(:disabled), [href], input, select, textarea"),
  ).filter((element) => !element.hasAttribute("disabled"));
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  tone = "primary",
  isPending = false,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const focusable = dialog ? focusableControls(dialog) : [];
    (focusable[focusable.length - 1] ?? dialog)?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) {
        onCancelRef.current();
        return;
      }
      if (e.key === "Tab" && dialog) {
        const controls = focusableControls(dialog);
        if (controls.length === 0) {
          e.preventDefault();
          dialog.focus();
          return;
        }
        const first = controls[0];
        const last = controls[controls.length - 1];
        const active = document.activeElement;
        if (!dialog.contains(active)) {
          e.preventDefault();
          (e.shiftKey ? last : first)?.focus();
          return;
        }
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [open, isPending]);

  if (!open) return null;

  const toneConfig = {
    danger: {
      iconBg: "bg-red-500/10 text-red-500",
      buttonClass:
        "bg-[var(--danger)] text-white hover:opacity-90 focus-visible:ring-[var(--danger)]",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
    },
    warning: {
      iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      buttonClass:
        "bg-amber-600 text-white hover:bg-amber-700 focus-visible:ring-amber-500 dark:bg-amber-600 dark:hover:bg-amber-500",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    primary: {
      iconBg: "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
      buttonClass:
        "bg-[var(--accent-primary)] text-white hover:opacity-90 focus-visible:ring-[var(--accent-primary)]",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  }[tone];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs transition-opacity animate-in fade-in-0"
      onClick={() => {
        if (!isPending) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        tabIndex={-1}
        className="w-full max-w-md rounded-2xl border border-[var(--border-primary)] bg-[var(--surface-card)] p-6 shadow-2xl transition-all space-y-4 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${toneConfig.iconBg}`}>
            {toneConfig.icon}
          </div>

          <div className="flex-1 space-y-1">
            <h3 id="confirm-dialog-title" className="text-base font-semibold text-[var(--foreground-primary)]">
              {title}
            </h3>
            <div className="text-xs text-[var(--foreground-muted)] leading-relaxed">
              {message}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--border-primary)]/50 pt-4">
          <button
            type="button"
            disabled={isPending}
            onClick={onCancel}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border-primary)] bg-[var(--surface-card)] px-4 text-xs font-medium text-[var(--foreground-primary)] hover:bg-[var(--surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--border-primary)] disabled:opacity-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={onConfirm}
            className={`inline-flex h-9 items-center justify-center rounded-lg px-4 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors ${toneConfig.buttonClass}`}
          >
            {isPending ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
