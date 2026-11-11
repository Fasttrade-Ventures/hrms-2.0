"use client";

import { useState, useTransition } from "react";

import { ConfirmDialog } from "@hrms/ui";

import { removeChecklistTemplateItem } from "@/lib/employees/checklist-actions";
import { Button } from "@/components/ui/button";

export function RemoveTemplateItemButton({ itemId, title }: { itemId: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" type="button" variant="ghost">
        Remove
      </Button>
      <ConfirmDialog
        confirmLabel={pending ? "Removing…" : "Remove"}
        isPending={pending}
        message={
          error
            ? error
            : `“${title}” will be removed from the template and from employee checklists that were copied from it.`
        }
        onCancel={() => {
          if (pending) return;
          setOpen(false);
          setError(undefined);
        }}
        onConfirm={() => {
          startTransition(async () => {
            try {
              await removeChecklistTemplateItem(itemId);
              setOpen(false);
              setError(undefined);
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : "Could not remove this task.");
            }
          });
        }}
        open={open}
        title="Remove task"
        tone="danger"
      />
    </>
  );
}
