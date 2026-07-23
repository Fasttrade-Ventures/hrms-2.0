"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ConfirmDialog } from "@hrms/ui";

import { deactivateEmployee } from "@/app/(hr)/hr/employees/actions";

export function DeleteEmployeeButton({
  employeeId,
  employeeName,
  variant = "button",
}: {
  employeeId: string;
  employeeName: string;
  variant?: "button" | "icon";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("status", "inactive");
      const result = await deactivateEmployee(employeeId, {}, formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      setOpen(false);
      router.push("/hr/employees");
      router.refresh();
    });
  }

  return (
    <>
      {variant === "icon" ? (
        <button
          aria-label={`Remove ${employeeName}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--border-primary)] bg-[var(--surface-card)] text-[var(--danger)] hover:bg-[var(--danger-soft)]"
          onClick={() => {
            setError(undefined);
            setOpen(true);
          }}
          title="Remove employee"
          type="button"
        >
          <svg aria-hidden fill="none" height="16" viewBox="0 0 24 24" width="16">
            <path
              d="M3 6h18M8 6V4h8v2m-1 0v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.75"
            />
          </svg>
        </button>
      ) : (
        <button
          className="inline-flex h-10 items-center rounded-[var(--radius-sm)] border border-[var(--danger)] px-4 text-sm font-medium text-[var(--danger)] hover:bg-[var(--danger-soft)]"
          onClick={() => {
            setError(undefined);
            setOpen(true);
          }}
          type="button"
        >
          Remove employee
        </button>
      )}

      <ConfirmDialog
        cancelLabel="Keep employee"
        confirmLabel={pending ? "Removing…" : "Yes, remove"}
        message={
          error
            ? error
            : `Remove ${employeeName} from the active directory? Their record stays in the system as inactive and can be restored later.`
        }
        onCancel={() => setOpen(false)}
        onConfirm={onConfirm}
        open={open}
        title="Remove this employee?"
        tone="danger"
      />
    </>
  );
}
