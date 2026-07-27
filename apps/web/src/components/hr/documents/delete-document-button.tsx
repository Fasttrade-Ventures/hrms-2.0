"use client";

import { useState, useTransition } from "react";

import { deleteDocumentAction } from "@/app/(hr)/hr/documents/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DeleteDocumentButton({
  documentId,
  fileName,
}: {
  documentId: string;
  fileName: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger
        render={
          <Button aria-label={`Delete ${fileName}`} size="icon-sm" type="button" variant="destructive" />
        }
      >
        ⌫
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Permanently delete this document?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This will permanently remove <strong>{fileName}</strong> from storage. This action cannot
          be undone.
        </p>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button onClick={() => setOpen(false)} type="button" variant="outline">
            Cancel
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(undefined);
                const result = await deleteDocumentAction(documentId);
                if (result.error) {
                  setError(result.error);
                  return;
                }
                setOpen(false);
              })
            }
            type="button"
            variant="destructive"
          >
            {pending ? "Deleting…" : "Yes, delete permanently"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
