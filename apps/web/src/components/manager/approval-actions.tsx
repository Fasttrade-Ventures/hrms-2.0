"use client";

import { useActionState, useRef, useState } from "react";

import { approveRequest, rejectRequest, type ManagerActionState } from "@/app/(manager)/manager/actions";
import { HrFormMessage } from "@/components/hr/employees/form-fields";
import { PortalSectionCard } from "@/components/portal/portal-section";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RichText } from "@/components/ui/rich-text";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { letterHtmlToText } from "@/lib/letters/html-text";

const initialState: ManagerActionState = {};

export function ApprovalActions({
  stepId,
  requesterName = "The employee",
  requestTypeLabel = "request",
}: {
  stepId: string;
  requesterName?: string;
  requestTypeLabel?: string;
}) {
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
  const hasComment = Boolean(letterHtmlToText(comment).trim());

  const handleConfirm = () => {
    setConfirmModal({ ...confirmModal, isOpen: false });
    if (confirmModal.type === "approve") {
      approveFormRef.current?.requestSubmit();
    } else {
      rejectFormRef.current?.requestSubmit();
    }
  };

  return (
    <PortalSectionCard
      description="Add an optional note for the employee and submit your decision."
      title="Your decision"
    >
      <form ref={approveFormRef} action={approveAction} className="hidden">
        <input name="stepId" type="hidden" value={stepId} />
        <input name="comment" type="hidden" value={comment} />
      </form>

      <form ref={rejectFormRef} action={rejectAction} className="hidden">
        <input name="stepId" type="hidden" value={stepId} />
        <input name="comment" type="hidden" value={comment} />
      </form>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Comment (optional)</Label>
          <RichTextEditor
            disabled={pending}
            minHeightClass="min-h-24"
            onChange={setComment}
            placeholder="Add a note for the employee"
          />
        </div>

        <div className="flex gap-3">
          <Button
            className="flex-1"
            disabled={pending}
            onClick={() => setConfirmModal({ isOpen: true, type: "approve" })}
            type="button"
          >
            {approvePending ? "Approving…" : "Approve"}
          </Button>
          <Button
            className="flex-1 border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--danger-soft)]"
            disabled={pending}
            onClick={() => setConfirmModal({ isOpen: true, type: "reject" })}
            type="button"
            variant="outline"
          >
            {rejectPending ? "Rejecting…" : "Reject"}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="mt-3">
          <HrFormMessage error={error} />
        </div>
      ) : null}

      {confirmModal.isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
          />

          <div className="relative w-full max-w-md overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-primary)] bg-[var(--surface-card)] p-6 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <h3 className="text-lg font-semibold text-[var(--foreground-primary)]">
                {confirmModal.type === "approve"
                  ? `Approve this ${requestTypeLabel.toLowerCase()}?`
                  : `Reject this ${requestTypeLabel.toLowerCase()}?`}
              </h3>
              <p className="mt-2 text-sm text-[var(--foreground-muted)]">
                {confirmModal.type === "approve"
                  ? `${requesterName} will be notified. This will approve the ${requestTypeLabel.toLowerCase()} application.`
                  : `${requesterName} will be notified. Please ensure you have added a comment explaining the rejection.`}
              </p>

              {hasComment ? (
                <div className="mt-4 w-full rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface-muted)] p-3 text-left">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
                    Your comment
                  </span>
                  <div className="mt-1">
                    <RichText value={comment} />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                className="flex-1"
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                className={`flex-1 ${
                  confirmModal.type === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
                onClick={handleConfirm}
                type="button"
              >
                {confirmModal.type === "approve" ? "Approve" : "Reject"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </PortalSectionCard>
  );
}
