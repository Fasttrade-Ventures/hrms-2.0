"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { cancelLeaveAction, revokeLeaveAction } from "@/app/(employee)/employee/actions";

export function LeaveActionControls({
  requestId,
  status,
}: {
  requestId: string;
  status: string;
}) {
  const router = useRouter();
  const [modalType, setModalType] = useState<"cancel" | "revoke" | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (status !== "pending" && status !== "approved") {
    return null;
  }

  const isCancel = status === "pending";

  function handleOpenModal(type: "cancel" | "revoke") {
    setError(null);
    setReason("");
    setModalType(type);
  }

  function handleCloseModal() {
    if (isPending) return;
    setModalType(null);
    setError(null);
    setReason("");
  }

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("requestId", requestId);
      if (reason.trim()) {
        formData.set("reason", reason.trim());
      }

      const action = modalType === "cancel" ? cancelLeaveAction : revokeLeaveAction;
      const result = await action({}, formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      setModalType(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex justify-end pt-4 border-t border-[var(--border-primary)]">
        {isCancel ? (
          <button
            type="button"
            onClick={() => handleOpenModal("cancel")}
            className="inline-flex h-10 min-w-[120px] items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--surface-card)] px-5 text-[15px] font-medium text-[var(--danger)] hover:bg-[var(--surface-muted)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--danger)]/30"
          >
            Cancel request
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleOpenModal("revoke")}
            className="inline-flex h-10 min-w-[120px] items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--surface-card)] px-5 text-[15px] font-medium text-[var(--danger)] hover:bg-[var(--surface-muted)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--danger)]/30"
          >
            Revoke leave
          </button>
        )}
      </div>

      {modalType && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-[420px] rounded-2xl border border-[var(--border-primary)] bg-[var(--surface-card)] p-6 shadow-[var(--shadow-elevated)] animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-base font-semibold text-[var(--foreground-primary)]">
              {modalType === "cancel" ? "Cancel Leave Request?" : "Revoke Approved Leave?"}
            </h2>

            <p className="mt-2.5 text-[13px] leading-relaxed text-[var(--foreground-muted)]">
              {modalType === "cancel"
                ? "Are you sure you want to cancel this pending leave request? This request will no longer be reviewed, and your pending leave days will be restored to your balance."
                : "Are you sure you want to revoke this approved leave? The approved leave will be cancelled and the days will be restored to your remaining entitlement."}
            </p>

            <div className="mt-4 space-y-1.5">
              <label
                htmlFor="action-reason"
                className="block text-xs font-medium text-[var(--foreground-secondary)]"
              >
                {modalType === "cancel" ? "Reason (optional)" : "Reason for revocation"}
              </label>
              <textarea
                id="action-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  modalType === "cancel"
                    ? "e.g. Trip rescheduled, no longer needed..."
                    : "e.g. Schedule changed, emergency resolved..."
                }
                disabled={isPending}
                className="w-full rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--surface-muted)] p-2.5 text-xs text-[var(--foreground-primary)] placeholder:text-[var(--foreground-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
              />
            </div>

            {error && (
              <div className="mt-3 rounded-[var(--radius-sm)] border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                {error}
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isPending}
                className="inline-flex h-10 min-w-[90px] items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--surface-card)] px-4 text-sm font-medium text-[var(--foreground-primary)] hover:bg-[var(--surface-muted)] disabled:opacity-50"
              >
                {modalType === "cancel" ? "Keep request" : "Keep leave"}
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={isPending}
                className="inline-flex h-10 min-w-[120px] items-center justify-center rounded-[var(--radius-sm)] bg-[var(--danger)] px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {isPending ? (
                  <span className="inline-flex items-center gap-2">
                    <svg
                      className="h-3.5 w-3.5 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Processing…
                  </span>
                ) : modalType === "cancel" ? (
                  "Yes, cancel request"
                ) : (
                  "Yes, revoke leave"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
