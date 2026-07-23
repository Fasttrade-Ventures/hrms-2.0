"use client";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  tone = "primary",
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  tone?: "primary" | "danger";
}) {
  if (!open) return null;

  const confirmClass =
    tone === "danger"
      ? "bg-[var(--danger)] text-white hover:opacity-90"
      : "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        aria-modal="true"
        className="w-full max-w-[380px] rounded-2xl border border-[var(--border-primary)] bg-[var(--surface-card)] p-[18px] shadow-[var(--shadow-elevated)]"
        role="dialog"
      >
        <h2 className="text-base font-semibold text-[var(--foreground-primary)]">{title}</h2>
        <p className="mt-3 text-[13px] leading-relaxed text-[var(--foreground-muted)]">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            className="inline-flex h-10 min-w-[90px] items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--surface-card)] px-4 text-[15px] font-medium text-[var(--foreground-primary)] hover:bg-[var(--surface-muted)]"
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={`inline-flex h-10 min-w-[120px] items-center justify-center rounded-[var(--radius-sm)] px-4 text-[15px] font-semibold ${confirmClass}`}
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
