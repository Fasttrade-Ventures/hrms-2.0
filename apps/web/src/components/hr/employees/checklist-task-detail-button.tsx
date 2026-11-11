"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const descriptionClassName =
  "text-sm text-foreground [&_a]:text-primary [&_a]:underline [&_h2]:mb-1 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-5";

export function ChecklistTaskDetailButton({
  title,
  description,
  done,
}: {
  title: string;
  description: string;
  done: boolean;
}) {
  const [open, setOpen] = useState(false);
  const hasDescription = description.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim().length > 0;

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" type="button" variant="outline">
        {done ? "Done" : "Open"}
      </Button>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          {hasDescription ? (
            <div className={descriptionClassName} dangerouslySetInnerHTML={{ __html: description }} />
          ) : (
            <p className="text-sm text-muted-foreground">No description.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
