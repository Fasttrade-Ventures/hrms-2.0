"use client";

import { useActionState, useRef, useState } from "react";

import { approveRequest, rejectRequest, type ManagerActionState } from "@/app/(manager)/manager/actions";
import { HrFormMessage } from "@/components/hr/employees/form-fields";
import { PortalSectionCard } from "@/components/portal/portal-section";

const initialState: ManagerActionState = {};

export function ApprovalActions({ stepId }: { stepId: string }) {
  const [approveState, approveAction, approvePending] = useActionState(approveRequest, initialState);
  const [rejectState, rejectAction, rejectPending] = useActionState(rejectRequest, initialState);
  const [comment, setComment] = useState("");
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: "approve" | "reject";
  }>({ isOpen: false, type: "approve" });

  const approveFormRef = useRef<HTMLFormElement>(null);
  const rejectFormRef = useRef<HTMLFormElement>(null);

  const error = approveState.error || rejectState.error;
  const pending = approvePending || rejectPending;

  const handleConfirm = () => {
    setConfirmModal({ ...confirmModal, isOpen: false });
    if (confirmModal.type === "approve") {
      approveFormRef.current?.requestSubmit();
    } else {
      rejectFormRef.current?.requestSubmit();
    }
  };

  return (
    <PortalSectionCard description="Add an optional note for the employee and submit your decision." title="Your decision">
      {/* Hidden Forms */}
      <form ref={approveFormRef} action={approveAction} className="hidden">
        <input name="stepId" type="hidden" value={stepId} />
        <input name="comment" type="hidden" value={comment} />
      </form>

      <form ref={rejectFormRef} action={rejectAction} className="hidden">
        <input name="stepId" type="hidden" value={stepId} />
        <input name="comment" type="hidden" value={comment} />
      </form>

      {/* Main Form Fields */}
      <div className="space-y-4">
        <label className="block space-y-2">
          <span className="text-[13px] font-medium text-[var(--foreground-primary)]">Comment (optional)</span>
          <textarea
            className="min-h-24 w-full rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface-muted)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--border-focus)] text-[var(--foreground-primary)] placeholder-[var(--foreground-muted)]"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a note for the employee"
            disabled={pending}
          />
        </label>

        <div className="flex gap-3">
          <button
            type="button"
            className="flex-1 flex h-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent-primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-60 transition-all duration-200"
            disabled={pending}
            onClick={() => setConfirmModal({ isOpen: true, type: "approve" })}
          >
            {approvePending ? "Approving…" : "Approve"}
          </button>
          
          <button
            type="button"
            className="flex-1 flex h-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--danger)] bg-transparent px-5 text-sm font-semibold text-[var(--danger)] hover:bg-[var(--danger-soft)] disabled:opacity-60 transition-all duration-200"
            disabled={pending}
            onClick={() => setConfirmModal({ isOpen: true, type: "reject" })}
          >
            {rejectPending ? "Rejecting…" : "Reject"}
          </button>
        </div>
      </div>

      {error ? <div className="mt-3"><HrFormMessage error={error} /></div> : null}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
          />
          
          <div className="relative w-full max-w-md transform overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-card)] border border-[var(--border-primary)] p-6 shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                confirmModal.type === "approve" 
                  ? "bg-emerald-500/15 text-emerald-500" 
                  : "bg-red-500/15 text-red-500"
              }`}>
                {confirmModal.type === "approve" ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
              </div>
              
              <h3 className="mt-4 text-lg font-semibold text-[var(--foreground-primary)]">
                {confirmModal.type === "approve" ? "Approve request?" : "Reject request?"}
              </h3>
              <p className="mt-2 text-sm text-[var(--foreground-muted)]">
                {confirmModal.type === "approve"
                  ? "Are you sure you want to approve this request? This will approve the employee's leave application."
                  : "Are you sure you want to reject this request? This will reject the employee's leave application."}
              </p>

              {comment.trim() && (
                <div className="mt-4 w-full rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3 text-left border border-[var(--border-primary)]">
                  <span className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider block">Your comment</span>
                  <p className="mt-1 text-sm text-[var(--foreground-primary)] break-words italic">&ldquo;{comment}&rdquo;</p>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                className="flex h-10 flex-1 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface-card)] text-sm font-medium text-[var(--foreground-primary)] hover:bg-[var(--surface-muted)] transition-colors duration-200"
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`flex h-10 flex-1 items-center justify-center rounded-[var(--radius-md)] text-sm font-semibold text-white shadow-sm transition-colors duration-200 ${
                  confirmModal.type === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
                onClick={handleConfirm}
              >
                {confirmModal.type === "approve" ? "Yes, approve" : "Yes, reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalSectionCard>
  );
}
