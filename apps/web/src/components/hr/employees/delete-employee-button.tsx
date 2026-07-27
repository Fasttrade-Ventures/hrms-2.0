"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ConfirmDialog } from "@hrms/ui";

import { deactivateEmployee } from "@/app/(hr)/hr/employees/actions";
import { Button } from "@/components/ui/button";

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
        <Button
          aria-label={`Remove ${employeeName}`}
          onClick={() => {
            setError(undefined);
            setOpen(true);
          }}
          size="icon-sm"
          title="Remove employee"
          type="button"
          variant="destructive"
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
        </Button>
      ) : (
        <Button
          onClick={() => {
            setError(undefined);
            setOpen(true);
          }}
          type="button"
          variant="outline"
        >
          Remove employee
        </Button>
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
